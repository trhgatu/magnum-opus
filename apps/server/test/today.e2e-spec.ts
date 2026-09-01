import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { CLOCK } from '../src/contexts/forge/habit-check-in/application/ports/clock.port';
import { TODAY_CLOCK } from '../src/contexts/forge/today/application/ports/today-clock.port';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

const FIXED_INSTANT = new Date('2026-08-31T08:00:00.000Z');

describe('Forge Today (E2E)', () => {
  let app: INestApplication;
  let ownerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TODAY_CLOCK)
      .useValue({
        now: () => new Date(FIXED_INSTANT),
      })
      .overrideProvider(CLOCK)
      .useValue({
        now: () => new Date(FIXED_INSTANT),
      })
      .compile();

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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/forge/today')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns the owner business date with no active Habits', async () => {
    const response = await request(app.getHttpServer())
      .get('/forge/today')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({
      date: '2026-08-31',
      timeZone: 'UTC',
      emptyReason: 'NO_ACTIVE_HABITS',
      routines: [],
      standaloneHabits: [],
    });

    expect(response.body).not.toHaveProperty('ownerId');
  });
  it('builds the private execution view and synchronizes a shared Habit check-in', async () => {
    const executionOwnerToken = await registerAndLogin('execution-owner');

    const otherOwnerToken = await registerAndLogin('other-owner');

    const sharedHabitId = await createDailyHabit(
      executionOwnerToken,
      'Drink water',
      'One glass',
    );

    const firstMorningHabitId = await createDailyHabit(
      executionOwnerToken,
      'Stretch',
      null,
    );

    const standaloneHabitId = await createDailyHabit(
      executionOwnerToken,
      'Journal',
      null,
    );

    await createDailyHabit(otherOwnerToken, 'Foreign private Habit', null);

    const morningRoutineId = await createRoutine(
      executionOwnerToken,
      'Morning',
    );

    const healthRoutineId = await createRoutine(executionOwnerToken, 'Health');

    await addHabitToRoutine(
      executionOwnerToken,
      morningRoutineId,
      firstMorningHabitId,
      1,
    );

    await addHabitToRoutine(
      executionOwnerToken,
      morningRoutineId,
      sharedHabitId,
      2,
    );

    await addHabitToRoutine(
      executionOwnerToken,
      healthRoutineId,
      sharedHabitId,
      1,
    );

    await request(app.getHttpServer())
      .put(`/habits/${sharedHabitId}/check-ins/today`)
      .set('Authorization', `Bearer ${executionOwnerToken}`)
      .expect(HttpStatus.OK);

    const response = await request(app.getHttpServer())
      .get('/forge/today')
      .set('Authorization', `Bearer ${executionOwnerToken}`)
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({
      date: '2026-08-31',
      timeZone: 'UTC',
      emptyReason: null,
      routines: [
        {
          id: healthRoutineId,
          title: 'Health',
          habits: [
            {
              id: sharedHabitId,
              title: 'Drink water',
              description: 'One glass',
              checkedIn: true,
            },
          ],
        },
        {
          id: morningRoutineId,
          title: 'Morning',
          habits: [
            {
              id: firstMorningHabitId,
              title: 'Stretch',
              description: null,
              checkedIn: false,
            },
            {
              id: sharedHabitId,
              title: 'Drink water',
              description: 'One glass',
              checkedIn: true,
            },
          ],
        },
      ],
      standaloneHabits: [
        {
          id: standaloneHabitId,
          title: 'Journal',
          description: null,
          checkedIn: false,
        },
      ],
    });

    expect(JSON.stringify(response.body)).not.toContain(
      'Foreign private Habit',
    );

    expect(JSON.stringify(response.body)).not.toContain('ownerId');
  });
  async function registerAndLogin(label: string): Promise<string> {
    const suffix = `${Date.now()}` + Math.random().toString(16).slice(2);

    const email = `today.${label}.${suffix}@example.com`;

    const password = 'today-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `today_${label}_${suffix}`,
        password,
      })
      .expect(HttpStatus.CREATED);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(HttpStatus.OK);

    return login.body.accessToken as string;
  }
  async function createDailyHabit(
    token: string,
    title: string,
    description: string | null,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title,
        description,
        frequencyType: 'DAILY',
        frequencyDays: [],
      })
      .expect(HttpStatus.CREATED);

    return response.body.id as string;
  }

  async function createRoutine(token: string, title: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/routines')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title,
      })
      .expect(HttpStatus.CREATED);

    return response.body.id as string;
  }

  async function addHabitToRoutine(
    token: string,
    routineId: string,
    habitId: string,
    expectedRevision: number,
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/routines/${routineId}/habits`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        habitId,
        expectedRevision,
      })
      .expect(HttpStatus.CREATED);
  }
});
