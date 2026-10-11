import {
  HabitHistory,
  isAliveOn,
  isDueOn,
  summarizeHabits,
} from './habit-month-summary';

const SEPTEMBER = { from: '2026-09-01', to: '2026-10-01' };

const build = (overrides: Partial<HabitHistory> = {}): HabitHistory => ({
  id: 'build-habit',
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
  checkInDays: new Set(),
  quitStartedOn: null,
  relapseDays: [],
  ...overrides,
});

const quit = (overrides: Partial<HabitHistory> = {}): HabitHistory => ({
  id: 'quit-habit',
  title: 'Thuốc lá',
  type: 'QUIT',
  createdOn: '2026-01-01',
  lifecycle: [],
  schedules: [],
  checkInDays: new Set(),
  quitStartedOn: '2026-08-01',
  relapseDays: [],
  ...overrides,
});

const days = (from: number, to: number, month = '09'): Set<string> =>
  new Set(
    Array.from(
      { length: to - from + 1 },
      (_, index) => `2026-${month}-${String(from + index).padStart(2, '0')}`,
    ),
  );

describe('isAliveOn', () => {
  it('is false before createdOn', () => {
    const habit = build({ createdOn: '2026-09-10' });

    expect(isAliveOn(habit, '2026-09-09')).toBe(false);
    expect(isAliveOn(habit, '2026-09-10')).toBe(true);
  });

  it('treats the archive day as not alive and the restore day as alive', () => {
    const habit = build({
      lifecycle: [
        { action: 'ARCHIVED', effectiveOn: '2026-09-10' },
        { action: 'RESTORED', effectiveOn: '2026-09-20' },
      ],
    });

    expect(isAliveOn(habit, '2026-09-09')).toBe(true);
    expect(isAliveOn(habit, '2026-09-10')).toBe(false);
    expect(isAliveOn(habit, '2026-09-19')).toBe(false);
    expect(isAliveOn(habit, '2026-09-20')).toBe(true);
  });

  it('keeps the day alive when archived and restored on the same day', () => {
    const habit = build({
      lifecycle: [
        { action: 'ARCHIVED', effectiveOn: '2026-09-10' },
        { action: 'RESTORED', effectiveOn: '2026-09-10' },
      ],
    });

    expect(isAliveOn(habit, '2026-09-10')).toBe(true);
  });
});

describe('isDueOn', () => {
  it('follows the schedule version in effect on each day', () => {
    // Đổi từ hàng ngày sang Thứ 2-4-6 từ ngày 15/9 (Thứ 3).
    const habit = build({
      schedules: [
        {
          frequencyType: 'DAILY',
          frequencyDays: [],
          effectiveFrom: '2026-01-01',
          effectiveTo: '2026-09-15',
        },
        {
          frequencyType: 'WEEKLY',
          frequencyDays: [1, 3, 5],
          effectiveFrom: '2026-09-15',
          effectiveTo: null,
        },
      ],
    });

    expect(isDueOn(habit, '2026-09-08')).toBe(true); // Thứ 3, còn hàng ngày
    expect(isDueOn(habit, '2026-09-15')).toBe(false); // Thứ 3, đã sang 2-4-6
    expect(isDueOn(habit, '2026-09-16')).toBe(true); // Thứ 4
  });

  it('ignores an empty same-day version [D, D)', () => {
    const habit = build({
      schedules: [
        {
          frequencyType: 'DAILY',
          frequencyDays: [],
          effectiveFrom: '2026-09-15',
          effectiveTo: '2026-09-15',
        },
        {
          frequencyType: 'WEEKLY',
          frequencyDays: [3],
          effectiveFrom: '2026-09-15',
          effectiveTo: null,
        },
      ],
    });

    expect(isDueOn(habit, '2026-09-15')).toBe(false); // Thứ 3
  });

  it('is never due for a QUIT habit or an archived day', () => {
    expect(isDueOn(quit(), '2026-09-15')).toBe(false);
    expect(
      isDueOn(
        build({
          lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-09-01' }],
        }),
        '2026-09-15',
      ),
    ).toBe(false);
  });
});

describe('summarizeHabits', () => {
  it('pools the completion rate over every due day of every BUILD habit', () => {
    // A: 30 ngày due, làm đủ 30. B: Thứ 2 hằng tuần → 4 ngày due, làm 0.
    const result = summarizeHabits(
      [
        build({ title: 'A', checkInDays: days(1, 30) }),
        build({
          title: 'B',
          schedules: [
            {
              frequencyType: 'WEEKLY',
              frequencyDays: [1],
              effectiveFrom: '2026-01-01',
              effectiveTo: null,
            },
          ],
        }),
      ],
      SEPTEMBER,
    );

    expect(result.buildCompletionRate).toBeCloseTo(30 / 34);
  });

  it('counts an archived habit only while it was alive in the month', () => {
    // "Chạy bộ" archive ngày 15/9: chỉ 1–14 là ngày due, làm đủ cả 14.
    const result = summarizeHabits(
      [
        build({
          title: 'Chạy bộ',
          lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-09-15' }],
          checkInDays: days(1, 14),
        }),
      ],
      SEPTEMBER,
    );

    expect(result.buildCompletionRate).toBe(1);
    expect(result.bestStreak).toEqual({ habitTitle: 'Chạy bộ', days: 14 });
  });

  it('only counts check-ins on due days', () => {
    const result = summarizeHabits(
      [
        build({
          lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-09-10' }],
          // Check-in ngày 10 (ngày archive) không phải ngày due.
          checkInDays: days(1, 10),
        }),
      ],
      SEPTEMBER,
    );

    expect(result.buildCompletionRate).toBe(1);
    expect(result.bestStreak?.days).toBe(9);
  });

  it('measures streaks over consecutive due days, skipping non-due days', () => {
    // Thứ 2-4-6, làm đủ mọi ngày due trong tháng 9 trừ 18/9 (Thứ 6).
    const mwf = [
      '2026-09-02',
      '2026-09-04',
      '2026-09-07',
      '2026-09-09',
      '2026-09-11',
      '2026-09-14',
      '2026-09-16',
      '2026-09-21',
      '2026-09-23',
      '2026-09-25',
      '2026-09-28',
      '2026-09-30',
    ];
    const result = summarizeHabits(
      [
        build({
          schedules: [
            {
              frequencyType: 'WEEKLY',
              frequencyDays: [1, 3, 5],
              effectiveFrom: '2026-01-01',
              effectiveTo: null,
            },
          ],
          checkInDays: new Set(mwf),
        }),
      ],
      SEPTEMBER,
    );

    // 2,4,7,9,11,14,16 = 7 liên tiếp; 18 bỏ lỡ làm đứt chuỗi; sau đó 5.
    expect(result.bestStreak?.days).toBe(7);
  });

  it('breaks ties for bestStreak and mostConsistentHabit in favour of the earlier habit', () => {
    const result = summarizeHabits(
      [
        build({ title: 'Earlier', checkInDays: days(1, 10) }),
        build({ title: 'Later', checkInDays: days(1, 10) }),
      ],
      SEPTEMBER,
    );

    expect(result.bestStreak?.habitTitle).toBe('Earlier');
    expect(result.mostConsistentHabit?.habitTitle).toBe('Earlier');
  });

  it('requires at least 7 due days to be the most consistent habit', () => {
    const result = summarizeHabits(
      [
        // Tạo ngày 25/9: 6 ngày due, làm đủ 6 (100%) — dưới ngưỡng.
        build({
          title: 'New',
          createdOn: '2026-09-25',
          checkInDays: days(25, 30),
        }),
        build({ title: 'Steady', checkInDays: days(1, 20) }),
      ],
      SEPTEMBER,
    );

    expect(result.mostConsistentHabit).toEqual({
      habitTitle: 'Steady',
      completionRate: 20 / 30,
    });
  });

  it('returns empty results when nothing was due', () => {
    expect(summarizeHabits([], SEPTEMBER)).toEqual({
      buildCompletionRate: 0,
      bestStreak: null,
      mostConsistentHabit: null,
      quitHabits: [],
    });
  });

  it('only counts days up to the end of the countable range', () => {
    // Tháng hiện tại, hôm nay là 10/9: mẫu số chỉ có 10 ngày.
    const result = summarizeHabits([build({ checkInDays: days(1, 5) })], {
      from: '2026-09-01',
      to: '2026-09-11',
    });

    expect(result.buildCompletionRate).toBe(0.5);
  });

  describe('QUIT habits', () => {
    it('measures days since the last relapse at the end of the range', () => {
      const result = summarizeHabits(
        [quit({ relapseDays: ['2026-08-20', '2026-09-10'] })],
        SEPTEMBER,
      );

      expect(result.quitHabits).toEqual([
        { habitTitle: 'Thuốc lá', daysSinceLastRelapse: 20 },
      ]);
    });

    it('falls back to quitStartedOn when there was no relapse yet', () => {
      const result = summarizeHabits(
        [quit({ quitStartedOn: '2026-09-01' })],
        SEPTEMBER,
      );

      expect(result.quitHabits[0].daysSinceLastRelapse).toBe(29);
    });

    it('ignores relapses after the reference day', () => {
      const result = summarizeHabits(
        [quit({ relapseDays: ['2026-09-10', '2026-10-05'] })],
        SEPTEMBER,
      );

      expect(result.quitHabits[0].daysSinceLastRelapse).toBe(20);
    });

    it('uses the last alive day as the reference for a habit archived mid-month', () => {
      const result = summarizeHabits(
        [
          quit({
            lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-09-11' }],
          }),
        ],
        SEPTEMBER,
      );

      // Ngày sống cuối là 10/9 → 40 ngày kể từ 1/8.
      expect(result.quitHabits[0].daysSinceLastRelapse).toBe(40);
    });

    it('skips a QUIT habit that was never alive or had not started quitting yet', () => {
      const result = summarizeHabits(
        [
          quit({
            title: 'Archived all month',
            lifecycle: [{ action: 'ARCHIVED', effectiveOn: '2026-08-15' }],
          }),
          quit({ title: 'Starts later', quitStartedOn: '2026-10-05' }),
        ],
        SEPTEMBER,
      );

      expect(result.quitHabits).toEqual([]);
    });
  });
});
