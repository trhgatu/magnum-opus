import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

describe('Habit (E2E)', () => {
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
      .get('/habits')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('runs the private Habit lifecycle with revision protection', async () => {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Morning walk',
        description: 'Outside without headphones',
        frequencyType: 'WEEKLY',
        frequencyDays: [5, 1],
      })
      .expect(HttpStatus.CREATED);

    const habitId = created.body.id as string;
    expect(created.body).toMatchObject({
      title: 'Morning walk',
      frequencyType: 'WEEKLY',
      frequencyDays: [1, 5],
      isActive: true,
      revision: 1,
    });
    expect(created.body).not.toHaveProperty('ownerId');

    await request(app.getHttpServer())
      .get(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('HABIT_NOT_FOUND'));

    const activeList = await request(app.getHttpServer())
      .get('/habits')
      .query({ search: 'walk' })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);
    expect(activeList.body.data).toHaveLength(1);
    expect(activeList.body.data[0].id).toBe(habitId);

    await request(app.getHttpServer())
      .put(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Stale overwrite',
        description: null,
        frequencyType: 'DAILY',
        frequencyDays: [],
        expectedRevision: 9,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => expect(body.code).toBe('HABIT_REVISION_CONFLICT'));

    const updated = await request(app.getHttpServer())
      .put(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Evening walk',
        description: null,
        frequencyType: 'DAILY',
        frequencyDays: [],
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);
    expect(updated.body).toMatchObject({
      title: 'Evening walk',
      frequencyType: 'DAILY',
      frequencyDays: [],
      revision: 2,
    });

    const archived = await request(app.getHttpServer())
      .patch(`/habits/${habitId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expectedRevision: 2 })
      .expect(HttpStatus.OK);
    expect(archived.body).toMatchObject({ isActive: false, revision: 3 });

    await request(app.getHttpServer())
      .get('/habits')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.data).toHaveLength(0));

    await request(app.getHttpServer())
      .get('/habits')
      .query({ status: 'ARCHIVED' })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.data[0].id).toBe(habitId));

    const restored = await request(app.getHttpServer())
      .patch(`/habits/${habitId}/restore`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expectedRevision: 3 })
      .expect(HttpStatus.OK);
    expect(restored.body).toMatchObject({ isActive: true, revision: 4 });
  });

  it('checks in idempotently, reads history and only undoes today', async () => {
    const createdHabit = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Drink water',
        frequencyType: 'DAILY',
        frequencyDays: [],
      })
      .expect(HttpStatus.CREATED);
    const habitId = createdHabit.body.id as string;
    const today = new Date().toISOString().slice(0, 10);

    const first = await request(app.getHttpServer())
      .put(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);
    const duplicate = await request(app.getHttpServer())
      .put(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);

    expect(first.body).toMatchObject({ habitId, date: today });
    expect(duplicate.body.id).toBe(first.body.id);

    await request(app.getHttpServer())
      .get(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          date: today,
          checkedIn: true,
          checkIn: { id: first.body.id, habitId, date: today },
        }),
      );

    await request(app.getHttpServer())
      .get(`/habits/${habitId}/check-ins`)
      .query({ from: today, to: today })
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('HABIT_NOT_FOUND'));

    await request(app.getHttpServer())
      .get(`/habits/${habitId}/check-ins`)
      .query({ from: today, to: today })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.dates).toEqual([today]));

    await request(app.getHttpServer())
      .patch(`/habits/${habitId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .put(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => expect(body.code).toBe('HABIT_CHECK_IN_FORBIDDEN'));

    await request(app.getHttpServer())
      .delete(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) =>
        expect(body).toEqual({ date: today, checkedIn: false, checkIn: null }),
      );
    await request(app.getHttpServer())
      .delete(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/habits/${habitId}/check-ins`)
      .query({ from: today, to: today })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.dates).toEqual([]));
  });

  async function registerAndLogin(label: string): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `habit.${label}.${suffix}@example.com`;
    const password = 'habit-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `habit_${label}_${suffix}`,
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
