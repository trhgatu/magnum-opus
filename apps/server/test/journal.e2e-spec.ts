import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

describe('Journal (E2E)', () => {
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

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/journal/entries')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('runs the private journal lifecycle with revision protection', async () => {
    const created = await request(app.getHttpServer())
      .post('/journal/entries')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        title: 'First thought',
        content: 'Original content',
      })
      .expect(HttpStatus.CREATED);

    const entryId = created.body.id as string;
    expect(created.body).toMatchObject({
      title: 'First thought',
      content: 'Original content',
      state: 'DRAFT',
      revision: 1,
    });
    expect(created.body).not.toHaveProperty('ownerId');

    await request(app.getHttpServer())
      .get('/journal/entries/' + entryId)
      .set('Authorization', 'Bearer ' + otherToken)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('JOURNAL_ENTRY_NOT_FOUND'));

    const updated = await request(app.getHttpServer())
      .put('/journal/entries/' + entryId)
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        title: 'Updated thought',
        content: 'Saved by the server',
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);
    expect(updated.body.revision).toBe(2);

    await request(app.getHttpServer())
      .put('/journal/entries/' + entryId)
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        title: 'Stale overwrite',
        content: 'Must not win',
        expectedRevision: 1,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('JOURNAL_ENTRY_REVISION_CONFLICT'),
      );

    const sealed = await lifecycle(entryId, 'seal', 2);
    expect(sealed.body).toMatchObject({
      state: 'SEALED',
      revision: 3,
    });

    await request(app.getHttpServer())
      .put('/journal/entries/' + entryId)
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        title: 'Illegal edit',
        content: 'A sealed entry cannot be edited',
        expectedRevision: 3,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('INVALID_JOURNAL_ENTRY_TRANSITION'),
      );

    const reopened = await lifecycle(entryId, 'reopen', 3);
    expect(reopened.body).toMatchObject({
      state: 'DRAFT',
      revision: 4,
    });

    const trashed = await lifecycle(entryId, 'trash', 4);
    expect(trashed.body).toMatchObject({
      state: 'TRASHED',
      stateBeforeTrash: 'DRAFT',
      revision: 5,
    });

    const defaultList = await request(app.getHttpServer())
      .get('/journal/entries')
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(HttpStatus.OK);
    expect(defaultList.body.data).toHaveLength(0);

    const trashList = await request(app.getHttpServer())
      .get('/journal/entries?state=TRASHED')
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(HttpStatus.OK);
    expect(trashList.body.data).toHaveLength(1);

    await request(app.getHttpServer())
      .patch('/journal/entries/' + entryId + '/restore')
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ expectedRevision: 5 })
      .expect(HttpStatus.NOT_FOUND);

    const restored = await lifecycle(entryId, 'restore', 5);
    expect(restored.body).toMatchObject({
      state: 'DRAFT',
      stateBeforeTrash: null,
      revision: 6,
    });

    await request(app.getHttpServer())
      .delete('/journal/entries/' + entryId)
      .query({ expectedRevision: 6 })
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('JOURNAL_ENTRY_PERMANENT_DELETE_FORBIDDEN'),
      );

    await lifecycle(entryId, 'trash', 6);

    await request(app.getHttpServer())
      .delete('/journal/entries/' + entryId)
      .query({ expectedRevision: 7 })
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get('/journal/entries/' + entryId)
      .set('Authorization', 'Bearer ' + ownerToken)
      .expect(HttpStatus.NOT_FOUND);
  });

  async function lifecycle(
    entryId: string,
    action: 'seal' | 'reopen' | 'trash' | 'restore',
    expectedRevision: number,
  ) {
    return request(app.getHttpServer())
      .patch('/journal/entries/' + entryId + '/' + action)
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ expectedRevision })
      .expect(HttpStatus.OK);
  }

  async function registerAndLogin(label: string): Promise<string> {
    const suffix = Date.now().toString() + Math.random().toString(16).slice(2);
    const email = 'journal.' + label + '.' + suffix + '@example.com';
    const password = 'journal-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: 'journal_' + label + '_' + suffix,
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
