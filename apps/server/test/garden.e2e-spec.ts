import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  calendarDayAt,
  calendarDayToDate,
} from '../src/shared/domain/calendar-day';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

// Thời gian chờ mỗi test phải dài hơn hạn chờ 10s của `eventually`.
jest.setTimeout(20_000);

// Garden ghi sổ qua outbox, chạy nền: chờ tới khi điều kiện đúng.
const eventually = async <T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
): Promise<T> => {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const value = await read();
    if (done(value) || Date.now() > deadline) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

describe('Garden ledger (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

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
    prisma = app.get(PrismaService);

    token = await registerAndLogin();
  });

  afterAll(async () => {
    await app?.close();
  });

  const subjectOf = (habitId: string) =>
    prisma.gardenSubject.findUnique({
      where: {
        subjectKind_subjectId: { subjectKind: 'HABIT', subjectId: habitId },
      },
    });

  it('plants a QUIT Habit on its quit start day', async () => {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Quit sugar',
        type: 'QUIT',
        quitStartedAt: '2026-11-01',
      })
      .expect(HttpStatus.CREATED);
    const habitId = created.body.id as string;

    const subject = await eventually(
      () => subjectOf(habitId),
      (row) => row !== null,
    );

    expect(subject).toMatchObject({
      ownerId: expect.any(String),
      variant: 'QUIT',
      nameAtPlanting: 'Quit sugar',
      simVersion: 1,
      plantedOn: new Date('2026-11-01T00:00:00.000Z'),
    });
  });

  it('uproots the subject when its Habit is deleted permanently', async () => {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Created by mistake',
        type: 'BUILD',
        frequencyType: 'DAILY',
        frequencyDays: [],
      })
      .expect(HttpStatus.CREATED);
    const habitId = created.body.id as string;
    expect(
      await eventually(
        () => subjectOf(habitId),
        (row) => row !== null,
      ),
    ).toMatchObject({ variant: 'BUILD' });

    await request(app.getHttpServer())
      .patch(`/habits/${habitId}/trash`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);
    await request(app.getHttpServer())
      .delete(`/habits/${habitId}`)
      .query({ expectedRevision: 2 })
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.NO_CONTENT);

    expect(
      await eventually(
        () => subjectOf(habitId),
        (row) => row === null,
      ),
    ).toBeNull();
  });

  it('records a check-in as TENDED and its undo as UNTENDED', async () => {
    const habitId = await createPlantedBuildHabit('Morning walk');

    const checkIn = await request(app.getHttpServer())
      .put(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
    // Check-in lần hai cùng ngày không ghi thêm dòng sổ nào.
    await request(app.getHttpServer())
      .put(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
    await request(app.getHttpServer())
      .delete(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.NO_CONTENT);
    // Không còn gì để rút lại: không ghi thêm.
    await request(app.getHttpServer())
      .delete(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.NO_CONTENT);

    const occurredOn = new Date(`${checkIn.body.date as string}T00:00:00.000Z`);
    const entries = await eventually(
      () => entriesOf(habitId),
      (rows) => rows.length >= 2,
    );
    expect(
      entries.map(({ kind, occurredOn }) => ({ kind, occurredOn })),
    ).toEqual([
      { kind: 'TENDED', occurredOn },
      { kind: 'UNTENDED', occurredOn },
    ]);
  });

  it('removes the entries together with an uprooted subject', async () => {
    const habitId = await createPlantedBuildHabit('Short-lived');
    await request(app.getHttpServer())
      .put(`/habits/${habitId}/check-ins/today`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
    const [entry] = await eventually(
      () => entriesOf(habitId),
      (rows) => rows.length === 1,
    );

    await request(app.getHttpServer())
      .patch(`/habits/${habitId}/trash`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);
    await request(app.getHttpServer())
      .delete(`/habits/${habitId}`)
      .query({ expectedRevision: 2 })
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.NO_CONTENT);
    await eventually(
      () => subjectOf(habitId),
      (row) => row === null,
    );

    expect(entry).toBeDefined();
    expect(
      await prisma.gardenEntry.findUnique({ where: { id: entry.id } }),
    ).toBeNull();
  });

  it("records each relapse as a SCAR on the owner's day", async () => {
    const habitId = await createPlantedQuitHabit('Quit coffee', '2026-11-01');

    const relapse = await request(app.getHttpServer())
      .post(`/habits/${habitId}/relapses`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.CREATED);
    await request(app.getHttpServer())
      .post(`/habits/${habitId}/relapses`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.CREATED);

    const { ownerId } = (await subjectOf(habitId))!;
    const { timeZone } = await prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { timeZone: true },
    });
    const occurredOn = calendarDayToDate(
      calendarDayAt(new Date(relapse.body.occurredAt as string), timeZone),
    );
    // Sổ ghi đủ từng lần; gộp một sẹo mỗi tuần là việc của lúc diễn giải.
    const entries = await eventually(
      () => entriesOf(habitId),
      (rows) => rows.length >= 2,
    );
    expect(
      entries.map(({ kind, mark, occurredOn }) => ({ kind, mark, occurredOn })),
    ).toEqual([
      { kind: 'MARKED', mark: 'SCAR', occurredOn },
      { kind: 'MARKED', mark: 'SCAR', occurredOn },
    ]);
  });

  it('replants a QUIT Habit when its start day changes', async () => {
    const habitId = await createPlantedQuitHabit('Quit gaming', '2026-11-01');

    // Chỉ sửa tên thì cây giữ ngày gieo.
    await request(app.getHttpServer())
      .put(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Quit video games',
        description: null,
        quitStartedAt: '2026-11-01',
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);
    await request(app.getHttpServer())
      .put(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Quit video games',
        description: null,
        quitStartedAt: '2026-11-05',
        expectedRevision: 2,
      })
      .expect(HttpStatus.OK);

    const subject = await eventually(
      () => subjectOf(habitId),
      (row) => row?.plantedOn.toISOString() === '2026-11-05T00:00:00.000Z',
    );
    expect(subject).toMatchObject({
      plantedOn: new Date('2026-11-05T00:00:00.000Z'),
      nameAtPlanting: 'Quit gaming',
    });
  });

  const entriesOf = (habitId: string) =>
    prisma.gardenEntry.findMany({
      where: {
        subject: { subjectKind: 'HABIT', subjectId: habitId },
      },
      orderBy: { recordedAt: 'asc' },
    });

  async function createPlantedBuildHabit(title: string): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, type: 'BUILD', frequencyType: 'DAILY', frequencyDays: [] })
      .expect(HttpStatus.CREATED);
    const habitId = created.body.id as string;
    await eventually(
      () => subjectOf(habitId),
      (row) => row !== null,
    );
    return habitId;
  }

  async function createPlantedQuitHabit(
    title: string,
    quitStartedAt: string,
  ): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, type: 'QUIT', quitStartedAt })
      .expect(HttpStatus.CREATED);
    const habitId = created.body.id as string;
    await eventually(
      () => subjectOf(habitId),
      (row) => row !== null,
    );
    return habitId;
  }

  async function registerAndLogin(): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `garden.${suffix}@example.com`;
    const password = 'garden-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username: `garden_${suffix}`, password })
      .expect(HttpStatus.CREATED);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(HttpStatus.OK);

    return login.body.accessToken as string;
  }
});
