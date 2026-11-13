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
        type: 'BUILD',
        frequencyType: 'WEEKLY',
        frequencyDays: [5, 1],
      })
      .expect(HttpStatus.CREATED);

    const habitId = created.body.id as string;
    expect(created.body).toMatchObject({
      title: 'Morning walk',
      type: 'BUILD',
      frequencyType: 'WEEKLY',
      frequencyDays: [1, 5],
      state: 'ACTIVE',
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
    expect(archived.body).toMatchObject({ state: 'ARCHIVED', revision: 3 });

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
    expect(restored.body).toMatchObject({ state: 'ACTIVE', revision: 4 });
  });

  it('checks in idempotently, reads history and only undoes today', async () => {
    const createdHabit = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Drink water',
        type: 'BUILD',
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

  it("lists active Habits with today's status, the last 7 days and the streak", async () => {
    // Tài khoản riêng: các test trên đã tạo Habit cho owner.
    const token = await registerAndLogin('overview');
    const today = new Date().toISOString().slice(0, 10);
    const daysAgo = (days: number) =>
      new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

    const build = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Meditate',
        type: 'BUILD',
        frequencyType: 'DAILY',
        frequencyDays: [],
      })
      .expect(HttpStatus.CREATED);
    await request(app.getHttpServer())
      .put(`/habits/${build.body.id}/check-ins/today`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'No phone at night',
        type: 'QUIT',
        quitStartedAt: daysAgo(5),
      })
      .expect(HttpStatus.CREATED);

    const archived = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Archived habit',
        type: 'BUILD',
        frequencyType: 'DAILY',
        frequencyDays: [],
      })
      .expect(HttpStatus.CREATED);
    await request(app.getHttpServer())
      .patch(`/habits/${archived.body.id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);

    const overview = await request(app.getHttpServer())
      .get('/habits/overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);

    expect(overview.body.date).toBe(today);
    // Sắp theo tên; Habit đã lưu trữ không có.
    expect(
      overview.body.habits.map((habit: { title: string }) => habit.title),
    ).toEqual(['Meditate', 'No phone at night']);

    const [meditate, quit] = overview.body.habits;
    expect(meditate).toMatchObject({
      id: build.body.id,
      type: 'BUILD',
      dueToday: true,
      checkedInToday: true,
      currentStreak: 1,
      longestStreak: 1,
      routines: [],
    });
    expect(meditate.checkedInAt).toEqual(expect.any(String));
    expect(meditate.lastSevenDays).toHaveLength(7);
    expect(meditate.lastSevenDays.at(-1)).toEqual({
      date: today,
      mark: 'DONE',
    });
    // Habit vừa tạo hôm nay: những ngày trước chưa theo dõi.
    expect(meditate.lastSevenDays[0].mark).toBe('UNTRACKED');

    expect(quit).toMatchObject({
      type: 'QUIT',
      quitStartedAt: daysAgo(5),
      currentStreak: 5,
      longestStreak: null,
      dueToday: false,
    });

    // Một Habit cho trang chi tiết: cùng dữ liệu với danh sách.
    await request(app.getHttpServer())
      .get(`/habits/${build.body.id}/overview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body.date).toBe(today);
        expect(body.habit).toEqual(meditate);
        expect(body.trace).toHaveLength(91);
        expect(body.trace.slice(-7)).toEqual(meditate.lastSevenDays);
      });

    // Habit đã lưu trữ vẫn mở được ở trang chi tiết.
    await request(app.getHttpServer())
      .get(`/habits/${archived.body.id}/overview`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body.habit.id).toBe(archived.body.id);
        expect(body.habit.lastSevenDays.at(-1).mark).toBe('UNTRACKED');
      });

    // Người khác không đọc được.
    await request(app.getHttpServer())
      .get(`/habits/${build.body.id}/overview`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('HABIT_NOT_FOUND'));

    await request(app.getHttpServer())
      .get('/habits/overview')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) =>
        expect(
          body.habits.some(
            (habit: { id: string }) => habit.id === build.body.id,
          ),
        ).toBe(false),
      );
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
