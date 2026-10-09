import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaHabitHistoryReader } from './prisma-habit-history.reader';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('PrismaHabitHistoryReader', () => {
  const habitModel = { findMany: jest.fn() };
  const prisma = { habit: habitModel };
  const reader = new PrismaHabitHistoryReader(prisma as never);
  const august = ChroniclePeriod.forMonth(2026, 8, 'Asia/Ho_Chi_Minh');
  const augustDays = { from: '2026-08-01', to: '2026-09-01' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the owner habits with history bounded by the countable days', async () => {
    habitModel.findMany.mockResolvedValue([]);

    await reader.findForOwner('owner-id', august, augustDays);

    const from = day('2026-08-01');
    const to = day('2026-09-01');
    expect(habitModel.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-id', createdOn: { lt: to } },
      select: {
        id: true,
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
          where: { occurredAt: { lt: august.end } },
          select: { occurredAt: true },
          orderBy: { occurredAt: 'asc' },
        },
      },
      orderBy: [{ createdOn: 'asc' }, { id: 'asc' }],
    });
  });

  it('restricts the query to the given habit ids', async () => {
    habitModel.findMany.mockResolvedValue([]);

    await reader.findForOwner('owner-id', august, augustDays, ['h1', 'h2']);

    expect(habitModel.findMany.mock.calls[0][0].where).toEqual({
      ownerId: 'owner-id',
      createdOn: { lt: day('2026-09-01') },
      id: { in: ['h1', 'h2'] },
    });
  });

  it('maps rows to calendar-day histories', async () => {
    habitModel.findMany.mockResolvedValue([
      {
        id: 'h1',
        title: 'Đọc sách',
        type: 'BUILD',
        createdOn: day('2026-01-01'),
        quitStartedAt: null,
        lifecycleTransitions: [
          { action: 'ARCHIVED', effectiveOn: day('2026-08-15') },
        ],
        scheduleVersions: [
          {
            frequencyType: 'WEEKLY',
            frequencyDays: [1, 3, 5],
            effectiveFrom: day('2026-01-01'),
            effectiveTo: null,
          },
        ],
        checkIns: [{ date: day('2026-08-03') }],
        relapses: [],
      },
    ]);

    await expect(
      reader.findForOwner('owner-id', august, augustDays),
    ).resolves.toEqual([
      {
        id: 'h1',
        title: 'Đọc sách',
        type: 'BUILD',
        createdOn: '2026-01-01',
        lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-08-15' }],
        schedules: [
          {
            frequencyType: 'WEEKLY',
            frequencyDays: [1, 3, 5],
            effectiveFrom: '2026-01-01',
            effectiveTo: null,
          },
        ],
        checkInDays: new Set(['2026-08-03']),
        quitStartedOn: null,
        relapseDays: [],
      },
    ]);
  });

  it('maps relapses to owner calendar days and drops those before quitStartedAt', async () => {
    habitModel.findMany.mockResolvedValue([
      {
        id: 'h2',
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

    const [habit] = await reader.findForOwner('owner-id', august, augustDays);

    expect(habit.quitStartedOn).toBe('2026-08-01');
    expect(habit.relapseDays).toEqual(['2026-08-21']);
  });
});
