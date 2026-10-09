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
import { ChronicleModule } from '../src/contexts/chronicle/chronicle.module';
import {
  CHRONICLE_SECTION_READERS,
  CLOCK,
  type ChronicleSectionReader,
} from '../src/contexts/chronicle/application/ports';
import { PrismaJournalChronicleReader } from '../src/contexts/chronicle/infrastructure/readers/prisma-journal-chronicle.reader';
import { PrismaMemoryChronicleReader } from '../src/contexts/chronicle/infrastructure/readers/prisma-memory-chronicle.reader';
import { PrismaMoodChronicleReader } from '../src/contexts/chronicle/infrastructure/readers/prisma-mood-chronicle.reader';
import { PrismaProjectChronicleReader } from '../src/contexts/chronicle/infrastructure/readers/prisma-project-chronicle.reader';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

// "Bây giờ" = 15/9/2026 10:00 giờ Việt Nam. Tháng 8 đã đóng, tháng 9 đang chạy.
const FIXED_NOW = new Date('2026-09-15T03:00:00.000Z');
const OWNER_TIME_ZONE = 'Asia/Ho_Chi_Minh';

// TODO(chronicle): bỏ 2 reader tạm này và override CHRONICLE_SECTION_READERS
// khi reader Habit/Routine thật có (cần Forge temporal history PR 2/3), đồng
// thời import ChronicleModule vào AppModule thay vì import riêng ở đây.
const placeholderHabitReader: ChronicleSectionReader<'habit'> = {
  module: 'habit',
  schemaVersion: 1,
  historyOnly: true,
  getSummary: () =>
    Promise.resolve({
      buildCompletionRate: 0,
      bestStreak: null,
      mostConsistentHabit: null,
      quitHabits: [],
    }),
};

const placeholderRoutineReader: ChronicleSectionReader<'routine'> = {
  module: 'routine',
  schemaVersion: 1,
  historyOnly: true,
  getSummary: () => Promise.resolve({ completionRate: 0 }),
};

describe('Chronicle (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, ChronicleModule],
    })
      .overrideProvider(CLOCK)
      .useValue({ now: () => new Date(FIXED_NOW) })
      .overrideProvider(CHRONICLE_SECTION_READERS)
      .useFactory({
        factory: (...readers: ChronicleSectionReader[]) => [
          ...readers,
          placeholderHabitReader,
          placeholderRoutineReader,
        ],
        inject: [
          PrismaJournalChronicleReader,
          PrismaMemoryChronicleReader,
          PrismaMoodChronicleReader,
          PrismaProjectChronicleReader,
        ],
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
