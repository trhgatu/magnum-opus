import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { gardenLight } from '../src/contexts/garden/domain/garden-light';
import { weekStartOf } from '../src/contexts/garden/domain/garden-week';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  calendarDayAt,
  calendarDayOf,
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

  it('records the schedule of a BUILD Habit, then each change, as RHYTHM_SET', async () => {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Gym',
        type: 'BUILD',
        frequencyType: 'WEEKLY',
        frequencyDays: [5, 1],
      })
      .expect(HttpStatus.CREATED);
    const habitId = created.body.id as string;

    await request(app.getHttpServer())
      .put(`/habits/${habitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Gym',
        description: null,
        frequencyType: 'DAILY',
        frequencyDays: [],
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);

    const rhythms = await eventually(
      () => rhythmsOf(habitId),
      (rows) => rows.length >= 2,
    );
    // Tạo và đổi lịch cùng ngày gieo: cả hai nhịp có hiệu lực từ ngày đó.
    // recordedAt có thể trùng mili giây nên không so thứ tự.
    const plantedOn = (await subjectOf(habitId))?.plantedOn;
    const seen = rhythms.map(({ detail, mark, occurredOn }) => ({
      detail,
      mark,
      occurredOn,
    }));
    expect(seen).toHaveLength(2);
    expect(seen).toEqual(
      expect.arrayContaining([
        {
          detail: { type: 'WEEKLY', days: [1, 5] },
          mark: null,
          occurredOn: plantedOn,
        },
        {
          detail: { type: 'DAILY', days: [] },
          mark: null,
          occurredOn: plantedOn,
        },
      ]),
    );
  });

  it('records archive as RESTED and restore as RESUMED', async () => {
    const habitId = await createPlantedBuildHabit('Evening read');

    await patchHabit(habitId, 'archive', 1);
    await patchHabit(habitId, 'restore', 2);

    const entries = await eventually(
      () => entriesOf(habitId),
      (rows) => rows.length >= 2,
    );
    expect(entries.map(({ kind }) => kind)).toEqual(['RESTED', 'RESUMED']);
  });

  it('hides the tree while its Habit is in Trash', async () => {
    const habitId = await createPlantedBuildHabit('Maybe later');

    await patchHabit(habitId, 'trash', 1);
    const hidden = await eventually(
      () => subjectOf(habitId),
      (row) => row?.hiddenAt != null,
    );
    expect(hidden?.hiddenAt).toBeInstanceOf(Date);

    await patchHabit(habitId, 'untrash', 2);
    const shown = await eventually(
      () => subjectOf(habitId),
      (row) => row?.hiddenAt === null,
    );
    expect(shown?.hiddenAt).toBeNull();
    // Trash từ ACTIVE là nghỉ, khôi phục là mọc tiếp; sổ không bị xóa.
    expect(
      (
        await eventually(
          () => entriesOf(habitId),
          (rows) => rows.length >= 2,
        )
      ).map(({ kind }) => kind),
    ).toEqual(['RESTED', 'RESUMED']);
  });

  it('renames and replants a QUIT Habit as it is edited', async () => {
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
      // Cây đổi tên theo Habit; tên lúc gieo giữ nguyên (Q-GDN-10).
      name: 'Quit video games',
    });
  });

  // BR-GDN-008: cây vào luống ở lần đầu Habit vào một Routine rồi ở yên đó.
  it('puts a tree in the bed of the first Routine its Habit joins', async () => {
    const habitId = await createPlantedBuildHabit('Stretch');
    const routine = async (title: string) =>
      (
        await request(app.getHttpServer())
          .post('/routines')
          .set('Authorization', `Bearer ${token}`)
          .send({ title })
          .expect(HttpStatus.CREATED)
      ).body.id as string;
    const first = await routine('Buổi sáng');
    const second = await routine('Buổi tối');

    for (const routineId of [first, second]) {
      await request(app.getHttpServer())
        .post(`/routines/${routineId}/habits`)
        .set('Authorization', `Bearer ${token}`)
        .send({ habitId, expectedRevision: 1 })
        .expect(HttpStatus.CREATED);
    }

    const subject = await eventually(
      () => subjectOf(habitId),
      (row) => row?.bedId != null,
    );
    expect(subject).toMatchObject({ bedId: first, bedName: 'Buổi sáng' });
  });

  // BA §7.4: niêm phong một trang là một lần nhìn lại; vườn sáng tỏ nhất hôm đó.
  it('lights the garden when a journal entry is sealed', async () => {
    const entry = await request(app.getHttpServer())
      .post('/journal/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hôm nay', content: 'Một ngày đáng nhớ.' })
      .expect(HttpStatus.CREATED);
    await request(app.getHttpServer())
      .patch(`/journal/entries/${entry.body.id as string}/seal`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);

    const reflected = await eventually(
      () =>
        prisma.gardenEntry.findFirst({
          where: { kind: 'REFLECTED', sourceRef: entry.body.id as string },
        }),
      (row) => row !== null,
    );
    expect(reflected).toMatchObject({ subjectId: null });

    const garden = await request(app.getHttpServer())
      .get('/garden')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
    // Tính từ ngày đã ghi và hôm nay trong response: niêm phong sát nửa đêm
    // thì hai mốc có thể khác ngày.
    expect(garden.body.light).toBe(
      gardenLight(
        calendarDayOf(reflected!.occurredOn),
        garden.body.today as string,
      ),
    );
    expect(garden.body.light).toBeGreaterThan(0.9);
  });

  it('hangs, moves, hides and removes the lantern of a memory', async () => {
    const created = await request(app.getHttpServer())
      .post('/memories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Mùa hè ở quê',
        content: 'Ngồi dưới gốc nhãn.',
        occurredOn: '2018-08-01',
        occurredOnPrecision: 'MONTH',
      })
      .expect(HttpStatus.CREATED);
    const memoryId = created.body.id as string;
    const lanternOf = () =>
      prisma.gardenLantern.findUnique({ where: { memoryId } });
    const lanternsInGarden = async () =>
      (
        await request(app.getHttpServer())
          .get('/garden')
          .set('Authorization', `Bearer ${token}`)
          .expect(HttpStatus.OK)
      ).body.lanterns as { memoryId: string; placedOn: string | null }[];

    await eventually(lanternOf, (row) => row !== null);
    expect(await lanternsInGarden()).toContainEqual(
      expect.objectContaining({
        memoryId,
        occurredOn: '2018-08-01',
        precision: 'MONTH',
        placedOn: '2018-08-15',
      }),
    );

    await request(app.getHttpServer())
      .put(`/memories/${memoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Mùa hè ở quê',
        content: 'Ngồi dưới gốc nhãn.',
        occurredOn: null,
        occurredOnPrecision: 'UNKNOWN',
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);
    const moved = await eventually(
      lanternOf,
      (row) => row?.precision === 'UNKNOWN',
    );
    expect(moved).toMatchObject({ occurredOn: null, hiddenAt: null });

    await request(app.getHttpServer())
      .patch(`/memories/${memoryId}/trash`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision: 2 })
      .expect(HttpStatus.OK);
    await eventually(lanternOf, (row) => row?.hiddenAt != null);
    expect(
      (await lanternsInGarden()).some((l) => l.memoryId === memoryId),
    ).toBe(false);

    await request(app.getHttpServer())
      .delete(`/memories/${memoryId}`)
      .query({ expectedRevision: 3 })
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.NO_CONTENT);
    expect(await eventually(lanternOf, (row) => row === null)).toBeNull();
  });

  it('serves the garden as weekly series and leaves trashed trees out', async () => {
    const tendedId = await createPlantedBuildHabit('Read a page');
    const checkIn = await request(app.getHttpServer())
      .put(`/habits/${tendedId}/check-ins/today`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
    const trashedId = await createPlantedBuildHabit('Hidden for now');
    await patchHabit(trashedId, 'trash', 1);
    await eventually(
      () => subjectOf(trashedId),
      (row) => row?.hiddenAt != null,
    );
    // Chờ nhịp đầu tiên và lần chăm vào sổ rồi mới đọc vườn.
    await eventually(
      () => entriesOf(tendedId),
      (rows) => rows.length >= 1,
    );
    await eventually(
      () => rhythmsOf(tendedId),
      (rows) => rows.length >= 1,
    );

    const garden = await request(app.getHttpServer())
      .get('/garden')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);

    // Các ngày lấy ở những thời điểm khác nhau có thể vắt qua nửa đêm của
    // owner: chỉ so tuần chứa ngày check-in, không so ngày tuyệt đối.
    const checkedOn = checkIn.body.date as string;
    expect(garden.body.today >= checkedOn).toBe(true);
    const trees = garden.body.trees as {
      subjectId: string;
      plantedOn: string;
      weeks: { start: string; status: string; scarred: boolean }[];
    }[];
    expect(trees.map((tree) => tree.subjectId)).toContain(tendedId);
    expect(trees.map((tree) => tree.subjectId)).not.toContain(trashedId);
    const tree = trees.find((candidate) => candidate.subjectId === tendedId);
    expect(tree).toMatchObject({
      variant: 'BUILD',
      name: 'Read a page',
      weeds: 0,
    });
    expect(tree!.plantedOn <= checkedOn).toBe(true);
    expect(
      tree!.weeks.find((week) => week.start === weekStartOf(checkedOn)),
    ).toEqual({
      start: weekStartOf(checkedOn),
      status: 'CARED',
      scarred: false,
    });
  });

  // Dòng nhịp có riêng rhythmsOf; các test khác chỉ xét những gì đã xảy ra.
  const entriesOf = (habitId: string) =>
    prisma.gardenEntry.findMany({
      where: {
        subject: { subjectKind: 'HABIT', subjectId: habitId },
        kind: { not: 'RHYTHM_SET' },
      },
      orderBy: { sequence: 'asc' },
    });

  const rhythmsOf = (habitId: string) =>
    prisma.gardenEntry.findMany({
      where: {
        subject: { subjectKind: 'HABIT', subjectId: habitId },
        kind: 'RHYTHM_SET',
      },
      orderBy: { sequence: 'asc' },
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

  async function patchHabit(
    habitId: string,
    action: 'archive' | 'restore' | 'trash' | 'untrash',
    expectedRevision: number,
  ): Promise<void> {
    await request(app.getHttpServer())
      .patch(`/habits/${habitId}/${action}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedRevision })
      .expect(HttpStatus.OK);
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
