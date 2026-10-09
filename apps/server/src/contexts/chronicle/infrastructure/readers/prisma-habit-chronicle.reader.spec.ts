import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaHabitChronicleReader } from './prisma-habit-chronicle.reader';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('PrismaHabitChronicleReader', () => {
  const habitModel = { findMany: jest.fn() };
  const prisma = { habit: habitModel };
  // "Bây giờ" = 15/9/2026 10:00 giờ Việt Nam.
  const clock = { now: () => new Date('2026-09-15T03:00:00.000Z') };
  const reader = new PrismaHabitChronicleReader(prisma as never, clock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares itself as a history-only habit reader', () => {
    expect(reader.module).toBe('habit');
    expect(reader.schemaVersion).toBe(1);
    expect(reader.historyOnly).toBe(true);
  });

  it('loads the owner habits with history bounded by the countable days', async () => {
    habitModel.findMany.mockResolvedValue([]);
    const period = ChroniclePeriod.forMonth(2026, 8, 'Asia/Ho_Chi_Minh');

    await reader.getSummary('owner-id', period);

    const from = day('2026-08-01');
    const to = day('2026-09-01');
    expect(habitModel.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-id', createdOn: { lt: to } },
      select: {
        title: true,
        type: true,
        createdOn: true,
        quitStartedAt: true,
        lifecycleTransitions: {
          where: { effectiveOn: { lt: to } },
          select: { action: true, effectiveOn: true },
          orderBy: [{ effectiveOn: 'asc' }, { occurredAt: 'asc' }],
        },
        scheduleVersions: {
          where: {
            effectiveFrom: { lt: to },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: from } }],
          },
          select: {
            frequencyType: true,
            frequencyDays: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        },
        checkIns: {
          where: { date: { gte: from, lt: to } },
          select: { date: true },
        },
        relapses: {
          where: { occurredAt: { lt: period.end } },
          select: { occurredAt: true },
          orderBy: { occurredAt: 'asc' },
        },
      },
      orderBy: [{ createdOn: 'asc' }, { id: 'asc' }],
    });
  });

  it('only counts the current month up to today in the owner time zone', async () => {
    habitModel.findMany.mockResolvedValue([
      {
        title: 'Đọc sách',
        type: 'BUILD',
        createdOn: day('2026-01-01'),
        quitStartedAt: null,
        lifecycleTransitions: [],
        scheduleVersions: [
          {
            frequencyType: 'DAILY',
            frequencyDays: [],
            effectiveFrom: day('2026-01-01'),
            effectiveTo: null,
          },
        ],
        checkIns: [day('2026-09-01'), day('2026-09-02'), day('2026-09-03')].map(
          (date) => ({ date }),
        ),
        relapses: [],
      },
    ]);

    const summary = await reader.getSummary(
      'owner-id',
      ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh'),
    );

    // 15 ngày due (1–15/9), làm 3.
    expect(summary.buildCompletionRate).toBeCloseTo(3 / 15);
    expect(habitModel.findMany.mock.calls[0][0].where.createdOn.lt).toEqual(
      day('2026-09-16'),
    );
  });

  it('maps relapses to owner calendar days and drops those before quitStartedAt', async () => {
    habitModel.findMany.mockResolvedValue([
      {
        title: 'Thuốc lá',
        type: 'QUIT',
        createdOn: day('2026-01-01'),
        quitStartedAt: day('2026-08-01'),
        lifecycleTransitions: [],
        scheduleVersions: [],
        checkIns: [],
        relapses: [
          // Trước quitStartedAt → thuộc lần cai trước, bỏ qua.
          { occurredAt: new Date('2026-07-20T12:00:00.000Z') },
          // 23:30Z ngày 20/8 = 06:30 ngày 21/8 giờ Việt Nam.
          { occurredAt: new Date('2026-08-20T23:30:00.000Z') },
        ],
      },
    ]);

    const summary = await reader.getSummary(
      'owner-id',
      ChroniclePeriod.forMonth(2026, 8, 'Asia/Ho_Chi_Minh'),
    );

    // Mốc = 31/8, relapse gần nhất = 21/8 → 10 ngày.
    expect(summary.quitHabits).toEqual([
      { habitTitle: 'Thuốc lá', daysSinceLastRelapse: 10 },
    ]);
  });
});
