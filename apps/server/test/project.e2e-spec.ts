import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

describe('Project (E2E)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    ownerToken = await registerAndLogin('owner');
    otherToken = await registerAndLogin('other');
  });

  afterAll(async () => {
    await app?.close();
  });

  const as = (token: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      request(app.getHttpServer())
        .put(url)
        .set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${token}`),
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/projects')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('runs a private Project through its lifecycle with V1.1 cycle flexibility', async () => {
    const owner = as(ownerToken);

    const created = await owner
      .post('/projects')
      .send({ title: 'Learn the piano', description: 'Canon in D' })
      .expect(HttpStatus.CREATED);
    const id = created.body.id as string;
    expect(created.body).toMatchObject({
      lifecycleState: 'NOT_STARTED',
      currentCycle: null,
      revision: 1,
    });
    expect(created.body).not.toHaveProperty('ownerId');

    await as(otherToken)
      .get(`/projects/${id}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('PROJECT_NOT_FOUND'));

    // BR-PRJ-034: a never-started Project has no Cycle for a closing note.
    await owner
      .patch(`/projects/${id}/stop`)
      .send({ expectedRevision: 1, closingNote: 'Không có chu kỳ' })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => expect(body.code).toBe('INVALID_CLOSING_NOTE'));

    const started = await owner
      .patch(`/projects/${id}/start`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);
    expect(started.body.revision).toBe(2);
    expect(started.body.currentCycle).toMatchObject({
      cycleNumber: 1,
      intendedOutcome: null,
      outcomeHistory: [],
      targetEndAt: null,
      closingNote: null,
    });

    // BR-PRJ-032: outcome changes are appended, not overwritten.
    await owner
      .put(`/projects/${id}/cycle/outcome`)
      .send({ expectedRevision: 2, intendedOutcome: 'Đàn Canon in D' })
      .expect(HttpStatus.OK);
    const secondOutcome = await owner
      .put(`/projects/${id}/cycle/outcome`)
      .send({ expectedRevision: 3, intendedOutcome: 'Đàn Für Elise rút gọn' })
      .expect(HttpStatus.OK);
    expect(secondOutcome.body.revision).toBe(4);
    expect(
      secondOutcome.body.currentCycle.outcomeHistory.map(
        (entry: { outcome: string }) => entry.outcome,
      ),
    ).toEqual(['Đàn Canon in D', 'Đàn Für Elise rút gọn']);
    expect(secondOutcome.body.currentCycle.intendedOutcome).toBe(
      'Đàn Für Elise rút gọn',
    );

    // Saving the same outcome again is a no-op: no new entry, same revision.
    const sameOutcome = await owner
      .put(`/projects/${id}/cycle/outcome`)
      .send({ expectedRevision: 4, intendedOutcome: ' Đàn Für Elise rút gọn ' })
      .expect(HttpStatus.OK);
    expect(sameOutcome.body.revision).toBe(4);
    expect(sameOutcome.body.currentCycle.outcomeHistory).toHaveLength(2);

    await owner
      .put(`/projects/${id}/cycle/outcome`)
      .send({ expectedRevision: 2, intendedOutcome: 'Stale' })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('PROJECT_REVISION_CONFLICT'),
      );

    // BR-PRJ-036: target end date, date-only, any real calendar date.
    await owner
      .put(`/projects/${id}/cycle/target-end`)
      .send({ expectedRevision: 4, targetEndAt: '2026-02-30' })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => expect(body.code).toBe('INVALID_TARGET_END_DATE'));
    await owner
      .put(`/projects/${id}/cycle/target-end`)
      .send({ expectedRevision: 4 })
      .expect(HttpStatus.BAD_REQUEST);

    const withTarget = await owner
      .put(`/projects/${id}/cycle/target-end`)
      .send({ expectedRevision: 4, targetEndAt: '2026-09-30' })
      .expect(HttpStatus.OK);
    expect(withTarget.body.revision).toBe(5);
    expect(withTarget.body.lifecycleState).toBe('ACTIVE');
    expect(withTarget.body.currentCycle.targetEndAt).toBe('2026-09-30');

    const cleared = await owner
      .put(`/projects/${id}/cycle/target-end`)
      .send({ expectedRevision: 5, targetEndAt: null })
      .expect(HttpStatus.OK);
    expect(cleared.body.currentCycle.targetEndAt).toBeNull();
    await owner
      .put(`/projects/${id}/cycle/target-end`)
      .send({ expectedRevision: 6, targetEndAt: '2026-09-30' })
      .expect(HttpStatus.OK);

    // BR-PRJ-034: the closing note is capped at 2000 characters.
    await owner
      .patch(`/projects/${id}/complete`)
      .send({ expectedRevision: 7, closingNote: 'a'.repeat(2001) })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => expect(body.code).toBe('INVALID_CLOSING_NOTE'));

    const completed = await owner
      .patch(`/projects/${id}/complete`)
      .send({ expectedRevision: 7, closingNote: '  Xong sớm hơn dự kiến  ' })
      .expect(HttpStatus.OK);
    expect(completed.body).toMatchObject({
      lifecycleState: 'COMPLETED',
      currentCycle: null,
      revision: 8,
    });

    // A closed Cycle is frozen.
    await owner
      .put(`/projects/${id}/cycle/target-end`)
      .send({ expectedRevision: 8, targetEndAt: null })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('INVALID_PROJECT_TRANSITION'),
      );

    // FR-PRJ-017: the closed Cycle keeps its history, note and target date.
    const closed = await owner
      .get(`/projects/${id}/cycles/closed`)
      .expect(HttpStatus.OK);
    expect(closed.body).toHaveLength(1);
    expect(closed.body[0]).toMatchObject({
      cycleNumber: 1,
      endReason: 'COMPLETED',
      closingNote: 'Xong sớm hơn dự kiến',
      targetEndAt: '2026-09-30',
      intendedOutcome: 'Đàn Für Elise rút gọn',
    });
    expect(closed.body[0].outcomeHistory).toHaveLength(2);
    expect(closed.body[0].endedAt).not.toBeNull();

    const reopened = await owner
      .patch(`/projects/${id}/reopen`)
      .send({ expectedRevision: 8 })
      .expect(HttpStatus.OK);
    expect(reopened.body.currentCycle).toMatchObject({
      cycleNumber: 2,
      outcomeHistory: [],
      targetEndAt: null,
      closingNote: null,
    });

    const stillOneClosed = await owner
      .get(`/projects/${id}/cycles/closed`)
      .expect(HttpStatus.OK);
    expect(
      stillOneClosed.body.map(
        (cycle: { cycleNumber: number }) => cycle.cycleNumber,
      ),
    ).toEqual([1]);

    await as(otherToken)
      .get(`/projects/${id}/cycles/closed`)
      .expect(HttpStatus.NOT_FOUND);
  });

  async function registerAndLogin(label: string): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `project.${label}.${suffix}@example.com`;
    const password = 'project-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `project_${label}_${suffix}`.slice(0, 50),
        password,
      })
      .expect(HttpStatus.CREATED);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(HttpStatus.OK);

    return login.body.accessToken as string;
  }
});
