import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  JournalEntryState,
  MemoryState,
  MoodLabel,
  ProjectLifecycleAction,
  ProjectLifecycleState,
} from '@repo/database';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { CLOCK } from '../src/contexts/chronicle/application/ports/clock.port';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

// "Bây giờ" = 15/9/2026 10:00 giờ Việt Nam. Tháng 8 đã đóng, tháng 9 đang chạy.
const FIXED_NOW = new Date('2026-09-15T03:00:00.000Z');
const OWNER_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('Chronicle (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CLOCK)
      .useValue({ now: () => new Date(FIXED_NOW) })
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

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/chronicle/2026/8')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('rejects a non-numeric path segment before reaching the domain', async () => {
    const { token } = await createOwner('bad-path');

    await request(app.getHttpServer())
      .get('/chronicle/2026/august')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('rejects an invalid month with the domain error code', async () => {
    const { token } = await createOwner('invalid-month');

    const response = await request(app.getHttpServer())
      .get('/chronicle/2026/13')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.BAD_REQUEST);

    expect(response.body.code).toBe('CHRONICLE_INVALID_MONTH');
  });

  it("rejects a month after the owner's current month", async () => {
    const { token } = await createOwner('future');

    const response = await request(app.getHttpServer())
      .get('/chronicle/2026/10')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.BAD_REQUEST);

    expect(response.body.code).toBe('CHRONICLE_MONTH_IN_FUTURE');
  });

  it('summarizes a closed month in the owner time zone and freezes it in a snapshot', async () => {
    const owner = await createOwner('closed-month');
    const stranger = await createOwner('stranger');

    // Journal + Mood — mốc 2026-07-31T23:00Z là 06:00 ngày 1/8 giờ Việt
    // Nam, nên thuộc tháng 8 dù theo UTC vẫn là tháng 7.
    await createJournalEntry(owner.id, '2026-07-31T23:00:00.000Z', {
      mood: MoodLabel.CALM,
    });
    await createJournalEntry(owner.id, '2026-08-10T12:00:00.000Z', {
      mood: MoodLabel.SAD,
    });
    await createJournalEntry(owner.id, '2026-08-20T12:00:00.000Z', {
      mood: MoodLabel.SAD,
    });
    const laterTrashed = await createJournalEntry(
      owner.id,
      '2026-08-25T12:00:00.000Z',
      { mood: MoodLabel.CALM },
    );
    // Không được đếm: nháp, đã trash, đầu tháng 9 giờ Việt Nam, và của người khác.
    await createJournalEntry(owner.id, '2026-08-12T12:00:00.000Z', {
      state: JournalEntryState.DRAFT,
    });
    await createJournalEntry(owner.id, '2026-08-13T12:00:00.000Z', {
      state: JournalEntryState.TRASHED,
    });
    await createJournalEntry(owner.id, '2026-08-31T17:30:00.000Z', {
      mood: MoodLabel.JOYFUL,
    });
    await createJournalEntry(stranger.id, '2026-08-15T12:00:00.000Z', {
      mood: MoodLabel.ANGRY,
    });

    // Memory
    await createMemory(
      owner.id,
      '2026-08-05T12:00:00.000Z',
      MemoryState.ACTIVE,
    );
    await createMemory(
      owner.id,
      '2026-08-06T12:00:00.000Z',
      MemoryState.ACTIVE,
    );
    await createMemory(
      owner.id,
      '2026-08-07T12:00:00.000Z',
      MemoryState.TRASHED,
    );

    // Project — A đang chạy từ tháng 7 rồi hoàn thành trong tháng 8;
    // B bắt đầu rồi dừng trong tháng 8; C đã tạm dừng từ tháng 7.
    await createProject(owner.id, [
      [ProjectLifecycleAction.START, 'NOT_STARTED', 'ACTIVE', '2026-07-03'],
      [ProjectLifecycleAction.COMPLETE, 'ACTIVE', 'COMPLETED', '2026-08-15'],
    ]);
    await createProject(owner.id, [
      [ProjectLifecycleAction.START, 'NOT_STARTED', 'ACTIVE', '2026-08-02'],
      [ProjectLifecycleAction.STOP, 'ACTIVE', 'STOPPED', '2026-08-10'],
    ]);
    await createProject(owner.id, [
      [ProjectLifecycleAction.START, 'NOT_STARTED', 'ACTIVE', '2026-06-01'],
      [ProjectLifecycleAction.PAUSE, 'ACTIVE', 'PAUSED', '2026-07-20'],
    ]);

    const first = await request(app.getHttpServer())
      .get('/chronicle/2026/8')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    expect(first.body).toMatchObject({
      year: 2026,
      month: 8,
      computedAt: FIXED_NOW.toISOString(),
      journal: { entryCount: 4 },
      mood: { dominantMood: 'CALM', distribution: { CALM: 2, SAD: 2 } },
      memory: { memoryCount: 2 },
      project: { activeCount: 2, completedCount: 1, stoppedCount: 1 },
    });
    expect(first.body).not.toHaveProperty('ownerId');

    const snapshot = await prisma.chronicleSnapshot.findUniqueOrThrow({
      where: {
        ownerId_periodType_periodKey: {
          ownerId: owner.id,
          periodType: 'MONTH',
          periodKey: '2026-08',
        },
      },
      include: { sections: true },
    });
    expect(snapshot.periodStart.toISOString()).toBe('2026-07-31T17:00:00.000Z');
    expect(snapshot.periodEnd.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(snapshot.sections.map((section) => section.module).sort()).toEqual([
      'habit',
      'journal',
      'memory',
      'mood',
      'project',
      'routine',
    ]);
    expect(
      snapshot.sections.every((section) => section.schemaVersion === 1),
    ).toBe(true);

    // Đưa 1 bài tháng 8 vào thùng rác SAU lần xem đầu: tháng 8 đã đóng băng.
    await prisma.journalEntry.update({
      where: { id: laterTrashed },
      data: { state: JournalEntryState.TRASHED, trashedAt: FIXED_NOW },
    });

    const second = await request(app.getHttpServer())
      .get('/chronicle/2026/8')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    expect(second.body).toEqual(first.body);
  });

  it('rebuilds habit and routine numbers of a closed month from Forge history', async () => {
    const owner = await createOwner('forge-history');

    // "Chạy bộ": hằng ngày từ 1/8, archive ngày 16/8 → chỉ 1–15 là ngày due,
    // check-in đủ cả 15 ngày.
    const running = await createHabit(owner.id, {
      title: 'Chạy bộ',
      createdOn: '2026-08-01',
      schedule: { frequencyType: 'DAILY', frequencyDays: [] },
      archivedOn: '2026-08-16',
      checkInDays: Array.from(
        { length: 15 },
        (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}`,
      ),
    });
    // "Đọc sách": Thứ 2 hằng tuần (3, 10, 17, 24, 31/8), không check-in.
    const reading = await createHabit(owner.id, {
      title: 'Đọc sách',
      createdOn: '2026-07-01',
      schedule: { frequencyType: 'WEEKLY', frequencyDays: [1] },
    });
    // "Thuốc lá": bỏ từ 1/8, tái phạm 06:30 ngày 21/8 giờ Việt Nam.
    await createHabit(owner.id, {
      title: 'Thuốc lá',
      createdOn: '2026-07-01',
      type: 'QUIT',
      quitStartedAt: '2026-08-01',
      relapsesAt: ['2026-08-20T23:30:00.000Z'],
    });

    // Routine gồm cả 2 Habit BUILD.
    const routine = await prisma.routine.create({
      data: {
        ownerId: owner.id,
        title: 'Buổi sáng',
        createdOn: day('2026-07-01'),
      },
      select: { id: true },
    });
    await prisma.routineHabitMembership.createMany({
      data: [
        {
          routineId: routine.id,
          habitId: running,
          ownerId: owner.id,
          addedOn: day('2026-08-01'),
        },
        {
          routineId: routine.id,
          habitId: reading,
          ownerId: owner.id,
          addedOn: day('2026-07-01'),
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/chronicle/2026/8')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    // Habit: 15/15 + 0/5 = 15/20. Đọc sách chỉ có 5 ngày due → dưới ngưỡng
    // 7, không được xét "đều đặn nhất".
    expect(response.body.habit).toEqual({
      buildCompletionRate: 0.75,
      bestStreak: { habitTitle: 'Chạy bộ', days: 15 },
      mostConsistentHabit: { habitTitle: 'Chạy bộ', completionRate: 1 },
      quitHabits: [{ habitTitle: 'Thuốc lá', daysSinceLastRelapse: 10 }],
    });
    // Routine: 1–15/8 có buổi (Chạy bộ due), 3 và 10/8 thêm Đọc sách nên
    // không hoàn thành; 17, 24, 31/8 chỉ còn Đọc sách → không hoàn thành.
    // 18 buổi, 13 hoàn thành.
    expect(response.body.routine.completionRate).toBeCloseTo(13 / 18);
  });

  it('computes the current month live without storing a snapshot', async () => {
    const owner = await createOwner('current-month');
    await createJournalEntry(owner.id, '2026-09-02T12:00:00.000Z', {});

    const response = await request(app.getHttpServer())
      .get('/chronicle/2026/9')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      year: 2026,
      month: 9,
      computedAt: FIXED_NOW.toISOString(),
      journal: { entryCount: 1 },
    });
    await expect(
      prisma.chronicleSnapshot.count({ where: { ownerId: owner.id } }),
    ).resolves.toBe(0);
  });

  it('returns zeros for a closed month without any data', async () => {
    const owner = await createOwner('empty-month');

    const response = await request(app.getHttpServer())
      .get('/chronicle/2020/1')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      journal: { entryCount: 0 },
      memory: { memoryCount: 0 },
      mood: { dominantMood: null, distribution: {} },
      project: { activeCount: 0, completedCount: 0, stoppedCount: 0 },
    });
  });

  it('stores exactly one snapshot when the first views of a month race', async () => {
    const owner = await createOwner('race');
    await createJournalEntry(owner.id, '2026-07-10T12:00:00.000Z', {});

    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app.getHttpServer())
          .get('/chronicle/2026/7')
          .set('Authorization', `Bearer ${owner.token}`),
      ),
    );

    for (const response of responses) {
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.journal).toEqual({ entryCount: 1 });
    }
    await expect(
      prisma.chronicleSnapshot.count({ where: { ownerId: owner.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.chronicleSnapshotSection.count({
        where: { snapshot: { ownerId: owner.id } },
      }),
    ).resolves.toBe(6);
  });

  async function createOwner(
    label: string,
  ): Promise<{ id: string; token: string }> {
    const suffix = `${Date.now()}` + Math.random().toString(16).slice(2);
    const email = `chronicle.${label}.${suffix}@example.com`;
    const password = 'chronicle-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username: `chronicle_${suffix}`, password })
      .expect(HttpStatus.CREATED);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(HttpStatus.OK);

    const user = await prisma.user.update({
      where: { email },
      data: { timeZone: OWNER_TIME_ZONE },
      select: { id: true },
    });

    return { id: user.id, token: login.body.accessToken as string };
  }

  async function createHabit(
    ownerId: string,
    options: {
      title: string;
      createdOn: string;
      type?: 'BUILD' | 'QUIT';
      schedule?: { frequencyType: 'DAILY' | 'WEEKLY'; frequencyDays: number[] };
      archivedOn?: string;
      checkInDays?: string[];
      quitStartedAt?: string;
      relapsesAt?: string[];
    },
  ): Promise<string> {
    const habit = await prisma.habit.create({
      data: {
        ownerId,
        title: options.title,
        type: options.type ?? 'BUILD',
        frequencyType: options.schedule?.frequencyType ?? null,
        frequencyDays: options.schedule?.frequencyDays ?? [],
        quitStartedAt: options.quitStartedAt
          ? day(options.quitStartedAt)
          : null,
        isActive: options.archivedOn === undefined,
        createdOn: day(options.createdOn),
      },
      select: { id: true },
    });

    if (options.schedule) {
      await prisma.habitScheduleVersion.create({
        data: {
          habitId: habit.id,
          ownerId,
          frequencyType: options.schedule.frequencyType,
          frequencyDays: options.schedule.frequencyDays,
          effectiveFrom: day(options.createdOn),
        },
      });
    }

    if (options.archivedOn) {
      await prisma.habitLifecycleTransition.create({
        data: {
          habitId: habit.id,
          ownerId,
          action: 'ARCHIVED',
          effectiveOn: day(options.archivedOn),
          occurredAt: new Date(`${options.archivedOn}T05:00:00.000Z`),
        },
      });
    }

    if (options.checkInDays?.length) {
      await prisma.habitCheckIn.createMany({
        data: options.checkInDays.map((checkInDay) => ({
          habitId: habit.id,
          ownerId,
          date: day(checkInDay),
        })),
      });
    }

    if (options.relapsesAt?.length) {
      await prisma.habitRelapse.createMany({
        data: options.relapsesAt.map((occurredAt) => ({
          habitId: habit.id,
          ownerId,
          occurredAt: new Date(occurredAt),
        })),
      });
    }

    return habit.id;
  }

  async function createJournalEntry(
    ownerId: string,
    createdAt: string,
    options: { state?: JournalEntryState; mood?: MoodLabel },
  ): Promise<string> {
    const entry = await prisma.journalEntry.create({
      data: {
        ownerId,
        title: 'Entry',
        content: 'Content',
        state: options.state ?? JournalEntryState.SEALED,
        createdAt: new Date(createdAt),
        ...(options.mood ? { mood: { create: { label: options.mood } } } : {}),
      },
      select: { id: true },
    });

    return entry.id;
  }

  async function createMemory(
    ownerId: string,
    createdAt: string,
    state: MemoryState,
  ): Promise<void> {
    await prisma.memory.create({
      data: {
        ownerId,
        title: 'Memory',
        content: 'Content',
        state,
        createdAt: new Date(createdAt),
      },
    });
  }

  async function createProject(
    ownerId: string,
    transitions: Array<
      [
        ProjectLifecycleAction,
        `${ProjectLifecycleState}`,
        `${ProjectLifecycleState}`,
        string,
      ]
    >,
  ): Promise<void> {
    const last = transitions[transitions.length - 1];

    await prisma.project.create({
      data: {
        ownerId,
        title: 'Project',
        lifecycleState: last[2],
        updatedAt: new Date(`${last[3]}T05:00:00.000Z`),
        transitions: {
          create: transitions.map(([action, fromState, toState, day]) => ({
            action,
            fromState,
            toState,
            occurredAt: new Date(`${day}T05:00:00.000Z`),
          })),
        },
      },
    });
  }
});
