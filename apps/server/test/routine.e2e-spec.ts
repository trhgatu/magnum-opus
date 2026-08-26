import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

describe('Routine (E2E)', () => {
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
      .get('/routines')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('validates Routine and Habit route UUIDs', async () => {
    await request(app.getHttpServer())
      .get('/routines/not-a-uuid')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('runs the private ordered Routine lifecycle with revision protection', async () => {
    const firstHabitId = await createHabit(ownerToken, 'Drink water');

    const secondHabitId = await createHabit(ownerToken, 'Morning walk');

    const inactiveHabitId = await createHabit(ownerToken, 'Archived practice');

    const foreignHabitId = await createHabit(otherToken, 'Foreign Habit');

    await request(app.getHttpServer())
      .patch(`/habits/${inactiveHabitId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);

    const created = await request(app.getHttpServer())
      .post('/routines')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: '  Morning ritual  ',
      })
      .expect(HttpStatus.CREATED);

    const routineId = created.body.id as string;

    expect(created.body).toMatchObject({
      title: 'Morning ritual',
      habitIds: [],
      isActive: true,
      revision: 1,
    });

    expect(created.body).not.toHaveProperty('ownerId');

    await request(app.getHttpServer())
      .get(`/routines/${routineId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('ROUTINE_NOT_FOUND'));

    const activeList = await request(app.getHttpServer())
      .get('/routines')
      .query({
        search: 'morning',
      })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);

    expect(activeList.body.data).toHaveLength(1);
    expect(activeList.body.data[0].id).toBe(routineId);

    await request(app.getHttpServer())
      .put(`/routines/${routineId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Stale overwrite',
        expectedRevision: 9,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('ROUTINE_REVISION_CONFLICT'),
      );

    const updated = await request(app.getHttpServer())
      .put(`/routines/${routineId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Evening ritual',
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);

    expect(updated.body).toMatchObject({
      title: 'Evening ritual',
      habitIds: [],
      revision: 2,
    });

    await request(app.getHttpServer())
      .post(`/routines/${routineId}/habits`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        habitId: foreignHabitId,
        expectedRevision: 2,
      })
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) =>
        expect(body.code).toBe('ROUTINE_HABIT_REFERENCE_NOT_FOUND'),
      );

    await request(app.getHttpServer())
      .post(`/routines/${routineId}/habits`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        habitId: inactiveHabitId,
        expectedRevision: 2,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => expect(body.code).toBe('ROUTINE_HABIT_INACTIVE'));

    const firstAdded = await request(app.getHttpServer())
      .post(`/routines/${routineId}/habits`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        habitId: firstHabitId,
        expectedRevision: 2,
      })
      .expect(HttpStatus.CREATED);

    expect(firstAdded.body).toMatchObject({
      habitIds: [firstHabitId],
      revision: 3,
    });

    const secondAdded = await request(app.getHttpServer())
      .post(`/routines/${routineId}/habits`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        habitId: secondHabitId,
        expectedRevision: 3,
      })
      .expect(HttpStatus.CREATED);

    expect(secondAdded.body).toMatchObject({
      habitIds: [firstHabitId, secondHabitId],
      revision: 4,
    });

    await request(app.getHttpServer())
      .post(`/routines/${routineId}/habits`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        habitId: secondHabitId,
        expectedRevision: 4,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('ROUTINE_HABIT_ALREADY_EXISTS'),
      );

    const movedUp = await request(app.getHttpServer())
      .patch(`/routines/${routineId}/habits/${secondHabitId}/up`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        expectedRevision: 4,
      })
      .expect(HttpStatus.OK);

    expect(movedUp.body).toMatchObject({
      habitIds: [secondHabitId, firstHabitId],
      revision: 5,
    });

    const boundaryNoOp = await request(app.getHttpServer())
      .patch(`/routines/${routineId}/habits/${secondHabitId}/up`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        expectedRevision: 5,
      })
      .expect(HttpStatus.OK);

    expect(boundaryNoOp.body).toMatchObject({
      habitIds: [secondHabitId, firstHabitId],
      revision: 5,
    });

    const movedDown = await request(app.getHttpServer())
      .patch(`/routines/${routineId}/habits/${secondHabitId}/down`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        expectedRevision: 5,
      })
      .expect(HttpStatus.OK);

    expect(movedDown.body).toMatchObject({
      habitIds: [firstHabitId, secondHabitId],
      revision: 6,
    });

    const removed = await request(app.getHttpServer())
      .delete(`/routines/${routineId}/habits/${firstHabitId}`)
      .query({
        expectedRevision: 6,
      })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);

    expect(removed.body).toMatchObject({
      habitIds: [secondHabitId],
      revision: 7,
    });

    await request(app.getHttpServer())
      .delete(`/routines/${routineId}/habits/${secondHabitId}`)
      .query({
        expectedRevision: 6,
      })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('ROUTINE_REVISION_CONFLICT'),
      );

    const fetched = await request(app.getHttpServer())
      .get(`/routines/${routineId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);

    expect(fetched.body).toMatchObject({
      id: routineId,
      title: 'Evening ritual',
      habitIds: [secondHabitId],
      revision: 7,
    });

    const archived = await request(app.getHttpServer())
      .patch(`/routines/${routineId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        expectedRevision: 7,
      })
      .expect(HttpStatus.OK);

    expect(archived.body).toMatchObject({
      isActive: false,
      revision: 8,
    });

    await request(app.getHttpServer())
      .get('/routines')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.data).toHaveLength(0));

    await request(app.getHttpServer())
      .get('/routines')
      .query({
        status: 'ARCHIVED',
      })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.data[0].id).toBe(routineId));

    const restored = await request(app.getHttpServer())
      .patch(`/routines/${routineId}/restore`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        expectedRevision: 8,
      })
      .expect(HttpStatus.OK);

    expect(restored.body).toMatchObject({
      isActive: true,
      revision: 9,
    });
  });

  async function createHabit(token: string, title: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title,
        frequencyType: 'DAILY',
        frequencyDays: [],
      })
      .expect(HttpStatus.CREATED);

    return response.body.id as string;
  }

  async function registerAndLogin(label: string): Promise<string> {
    const suffix = `${Date.now()}` + Math.random().toString(16).slice(2);

    const email = `routine.${label}.${suffix}@example.com`;

    const password = 'routine-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `routine_${label}_${suffix}`,
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
});
