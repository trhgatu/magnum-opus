import { HabitHistory } from '../../application/services/habit-month-summary';
import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaRoutineChronicleReader } from './prisma-routine-chronicle.reader';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('PrismaRoutineChronicleReader', () => {
  const routineModel = { findMany: jest.fn() };
  const prisma = { routine: routineModel };
  const habitHistories = { findForOwner: jest.fn() };
  const clock = { now: () => new Date('2026-09-15T03:00:00.000Z') };
  const reader = new PrismaRoutineChronicleReader(
    prisma as never,
    habitHistories as never,
    clock,
  );
  const august = ChroniclePeriod.forMonth(2026, 8, 'Asia/Ho_Chi_Minh');

  const dailyHabit = (id: string, checkInDays: string[]): HabitHistory => ({
    id,
    title: id,
    type: 'BUILD',
    createdOn: '2026-01-01',
    lifecycle: [],
    schedules: [
      {
        frequencyType: 'DAILY',
        frequencyDays: [],
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
      },
    ],
    checkInDays: new Set(checkInDays),
    quitStartedOn: null,
    relapseDays: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares itself as a history-only routine reader', () => {
    expect(reader.module).toBe('routine');
    expect(reader.schemaVersion).toBe(1);
    expect(reader.historyOnly).toBe(true);
  });

  it('loads routines with lifecycle and membership history overlapping the countable days', async () => {
    routineModel.findMany.mockResolvedValue([]);

    await reader.getSummary('owner-id', august);

    const from = day('2026-08-01');
    const to = day('2026-09-01');
    expect(routineModel.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-id', createdOn: { lt: to } },
      select: {
        createdOn: true,
        lifecycleTransitions: {
          where: { effectiveOn: { lt: to } },
          select: { action: true, effectiveOn: true },
          orderBy: [{ effectiveOn: 'asc' }, { occurredAt: 'asc' }],
        },
        membershipHistory: {
          where: {
            addedOn: { lt: to },
            OR: [{ removedOn: null }, { removedOn: { gt: from } }],
          },
          select: { habitId: true, addedOn: true, removedOn: true },
        },
      },
    });
  });

  it('returns 0 without loading habits when no routine had members', async () => {
    routineModel.findMany.mockResolvedValue([
      {
        createdOn: day('2026-01-01'),
        lifecycleTransitions: [],
        membershipHistory: [],
      },
    ]);

    await expect(reader.getSummary('owner-id', august)).resolves.toEqual({
      completionRate: 0,
    });
    expect(habitHistories.findForOwner).not.toHaveBeenCalled();
  });

  it('loads each member habit once and summarizes the sessions', async () => {
    // A nằm trong Routine cả tháng 8; B được gỡ ngày 2/8 rồi thêm lại 10/8.
    routineModel.findMany.mockResolvedValue([
      {
        createdOn: day('2026-01-01'),
        lifecycleTransitions: [],
        membershipHistory: [
          { habitId: 'A', addedOn: day('2026-01-01'), removedOn: null },
          {
            habitId: 'B',
            addedOn: day('2026-01-01'),
            removedOn: day('2026-08-02'),
          },
          { habitId: 'B', addedOn: day('2026-08-10'), removedOn: null },
        ],
      },
    ]);
    const everyAugustDay = Array.from(
      { length: 31 },
      (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}`,
    );
    habitHistories.findForOwner.mockResolvedValue([
      dailyHabit('A', everyAugustDay),
      dailyHabit('B', []),
    ]);

    const summary = await reader.getSummary('owner-id', august);

    expect(habitHistories.findForOwner).toHaveBeenCalledWith(
      'owner-id',
      august,
      { from: '2026-08-01', to: '2026-09-01' },
      ['A', 'B'],
    );
    // 31 buổi; B (không check-in) có mặt ngày 1 và 10–31 → 23 buổi thiếu.
    expect(summary.completionRate).toBeCloseTo(8 / 31);
  });

  it('skips membership intervals of habits that were not loaded', async () => {
    routineModel.findMany.mockResolvedValue([
      {
        createdOn: day('2026-01-01'),
        lifecycleTransitions: [],
        membershipHistory: [
          { habitId: 'A', addedOn: day('2026-01-01'), removedOn: null },
          { habitId: 'Gone', addedOn: day('2026-01-01'), removedOn: null },
        ],
      },
    ]);
    habitHistories.findForOwner.mockResolvedValue([
      dailyHabit('A', ['2026-08-01']),
    ]);

    const summary = await reader.getSummary('owner-id', august);

    expect(summary.completionRate).toBeCloseTo(1 / 31);
  });
});
