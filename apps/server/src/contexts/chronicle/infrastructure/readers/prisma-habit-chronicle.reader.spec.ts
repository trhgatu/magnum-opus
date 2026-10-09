import { HabitHistory } from '../../application/services/habit-month-summary';
import { ChroniclePeriod } from '../../domain/value-objects';

import { PrismaHabitChronicleReader } from './prisma-habit-chronicle.reader';

describe('PrismaHabitChronicleReader', () => {
  const habitHistories = { findForOwner: jest.fn() };
  // "Bây giờ" = 15/9/2026 10:00 giờ Việt Nam.
  const clock = { now: () => new Date('2026-09-15T03:00:00.000Z') };
  const reader = new PrismaHabitChronicleReader(habitHistories as never, clock);

  const dailyHabit = (checkInDays: string[]): HabitHistory => ({
    id: 'h1',
    title: 'Đọc sách',
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

  it('declares itself as a history-only habit reader', () => {
    expect(reader.module).toBe('habit');
    expect(reader.schemaVersion).toBe(1);
    expect(reader.historyOnly).toBe(true);
  });

  it('summarizes every owner habit over the countable days of a closed month', async () => {
    habitHistories.findForOwner.mockResolvedValue([
      dailyHabit(['2026-08-01', '2026-08-02']),
    ]);
    const period = ChroniclePeriod.forMonth(2026, 8, 'Asia/Ho_Chi_Minh');

    const summary = await reader.getSummary('owner-id', period);

    expect(habitHistories.findForOwner).toHaveBeenCalledWith(
      'owner-id',
      period,
      { from: '2026-08-01', to: '2026-09-01' },
    );
    expect(summary.buildCompletionRate).toBeCloseTo(2 / 31);
  });

  it('only counts the current month up to today in the owner time zone', async () => {
    habitHistories.findForOwner.mockResolvedValue([
      dailyHabit(['2026-09-01', '2026-09-02', '2026-09-03']),
    ]);

    const summary = await reader.getSummary(
      'owner-id',
      ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh'),
    );

    // 15 ngày due (1–15/9), làm 3.
    expect(habitHistories.findForOwner.mock.calls[0][2]).toEqual({
      from: '2026-09-01',
      to: '2026-09-16',
    });
    expect(summary.buildCompletionRate).toBeCloseTo(3 / 15);
  });
});
