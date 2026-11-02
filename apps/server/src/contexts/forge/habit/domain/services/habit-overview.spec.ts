import {
  type HabitOverviewHistory,
  summarizeHabitOverview,
} from './habit-overview';

// 2026-11-02 là Thứ Hai.
const TODAY = '2026-11-02';

const build = (
  overrides: Partial<HabitOverviewHistory> = {},
): HabitOverviewHistory => ({
  type: 'BUILD',
  createdOn: '2026-10-01',
  lifecycle: [],
  schedules: [
    {
      frequencyType: 'DAILY',
      frequencyDays: [],
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
    },
  ],
  checkInDays: new Set(),
  quitStartedOn: null,
  relapseDays: new Set(),
  ...overrides,
});

const days = (...list: string[]) => new Set(list);

describe('summarizeHabitOverview — BUILD', () => {
  it('counts consecutive done days back from yesterday when today is not done yet', () => {
    const overview = summarizeHabitOverview(
      build({
        checkInDays: days(
          '2026-10-29',
          '2026-10-30',
          '2026-10-31',
          '2026-11-01',
        ),
      }),
      TODAY,
    );

    expect(overview.currentStreak).toBe(4);
    expect(overview.dueToday).toBe(true);
    expect(overview.checkedInToday).toBe(false);
    expect(overview.lastSevenDays.at(-1)).toEqual({
      date: TODAY,
      mark: 'PENDING',
    });
  });

  it('adds today once it is checked in', () => {
    const overview = summarizeHabitOverview(
      build({ checkInDays: days('2026-11-01', TODAY) }),
      TODAY,
    );

    expect(overview.currentStreak).toBe(2);
    expect(overview.checkedInToday).toBe(true);
  });

  it('breaks the streak at the last missed scheduled day', () => {
    const overview = summarizeHabitOverview(
      build({
        checkInDays: days(
          '2026-10-28',
          '2026-10-29',
          '2026-10-31',
          '2026-11-01',
        ),
      }),
      TODAY,
    );

    // 30/10 bỏ lỡ: chuỗi hiện tại chỉ còn 31/10 và 1/11.
    expect(overview.currentStreak).toBe(2);
    expect(overview.longestStreak).toBe(2);
    expect(overview.lastSevenDays.map((day) => day.mark)).toEqual([
      'MISSED', // 27/10
      'DONE',
      'DONE',
      'MISSED', // 30/10
      'DONE',
      'DONE',
      'PENDING',
    ]);
  });

  it('skips rest days of a weekly schedule without breaking the streak', () => {
    // T2 · T4 · T6.
    const overview = summarizeHabitOverview(
      build({
        schedules: [
          {
            frequencyType: 'WEEKLY',
            frequencyDays: [1, 3, 5],
            effectiveFrom: '2026-10-01',
            effectiveTo: null,
          },
        ],
        checkInDays: days('2026-10-26', '2026-10-28', '2026-10-30'),
      }),
      TODAY,
    );

    expect(overview.currentStreak).toBe(3);
    expect(overview.lastSevenDays.map((day) => day.mark)).toEqual([
      'REST', // T3 27/10
      'DONE', // T4
      'REST', // T5
      'DONE', // T6
      'REST', // T7
      'REST', // CN
      'PENDING', // T2 hôm nay
    ]);
    expect(overview.nextDueOn).toBe('2026-11-04');
  });

  it('reports no due today and the next scheduled day on a rest day', () => {
    const overview = summarizeHabitOverview(
      build({
        schedules: [
          {
            frequencyType: 'WEEKLY',
            frequencyDays: [2, 4, 6],
            effectiveFrom: '2026-10-01',
            effectiveTo: null,
          },
        ],
        checkInDays: days('2026-10-31'),
      }),
      TODAY,
    );

    expect(overview.dueToday).toBe(false);
    expect(overview.lastSevenDays.at(-1)?.mark).toBe('REST');
    expect(overview.nextDueOn).toBe('2026-11-03');
    expect(overview.currentStreak).toBe(1);
  });

  it('leaves the next scheduled day empty when none falls in the next 7 days', () => {
    const overview = summarizeHabitOverview(
      build({
        schedules: [
          {
            frequencyType: 'DAILY',
            frequencyDays: [],
            effectiveFrom: '2026-10-01',
            effectiveTo: '2026-11-03',
          },
        ],
      }),
      TODAY,
    );

    expect(overview.dueToday).toBe(true);
    expect(overview.nextDueOn).toBeNull();
  });

  it('follows the schedule that was in effect on each day', () => {
    // Hằng ngày tới hết 28/10, sau đó chỉ Thứ Hai.
    const overview = summarizeHabitOverview(
      build({
        schedules: [
          {
            frequencyType: 'DAILY',
            frequencyDays: [],
            effectiveFrom: '2026-10-01',
            effectiveTo: '2026-10-29',
          },
          {
            frequencyType: 'WEEKLY',
            frequencyDays: [1],
            effectiveFrom: '2026-10-29',
            effectiveTo: null,
          },
        ],
        checkInDays: days('2026-10-27', '2026-10-28', TODAY),
      }),
      TODAY,
    );

    // 29/10–1/11 không có lịch theo phiên bản mới, nên không làm đứt chuỗi.
    expect(overview.currentStreak).toBe(3);
  });

  it('does not count days before the habit was created or while it was archived', () => {
    const overview = summarizeHabitOverview(
      build({
        createdOn: '2026-10-29',
        lifecycle: [
          { action: 'ARCHIVED', effectiveOn: '2026-10-30' },
          { action: 'RESTORED', effectiveOn: '2026-11-01' },
        ],
        checkInDays: days('2026-10-29', '2026-11-01'),
      }),
      TODAY,
    );

    expect(overview.currentStreak).toBe(2);
    expect(overview.lastSevenDays.map((day) => day.mark)).toEqual([
      'UNTRACKED',
      'UNTRACKED',
      'DONE', // 29/10, ngày tạo
      'UNTRACKED', // lưu trữ
      'UNTRACKED',
      'DONE',
      'PENDING',
    ]);
  });

  it('keeps the longest streak even after it ended', () => {
    const overview = summarizeHabitOverview(
      build({
        checkInDays: days(
          '2026-10-01',
          '2026-10-02',
          '2026-10-03',
          '2026-10-04',
          '2026-10-05',
          '2026-11-01',
        ),
      }),
      TODAY,
    );

    expect(overview.longestStreak).toBe(5);
    expect(overview.currentStreak).toBe(1);
  });

  it('shows a check-in on a rest day as done without counting it in the streak', () => {
    const overview = summarizeHabitOverview(
      build({
        schedules: [
          {
            frequencyType: 'WEEKLY',
            frequencyDays: [1],
            effectiveFrom: '2026-10-01',
            effectiveTo: null,
          },
        ],
        checkInDays: days('2026-10-31'),
      }),
      TODAY,
    );

    expect(overview.lastSevenDays[4]).toEqual({
      date: '2026-10-31',
      mark: 'DONE',
    });
    // Thứ Hai 26/10 có lịch mà bỏ lỡ.
    expect(overview.currentStreak).toBe(0);
  });
});

describe('summarizeHabitOverview — QUIT', () => {
  const quit = (overrides: Partial<HabitOverviewHistory> = {}) =>
    build({
      type: 'QUIT',
      schedules: [],
      quitStartedOn: '2026-10-10',
      ...overrides,
    });

  it('counts days since the quit started when there is no relapse', () => {
    const overview = summarizeHabitOverview(quit(), TODAY);

    expect(overview.currentStreak).toBe(23);
    expect(overview.longestStreak).toBeNull();
    expect(overview.dueToday).toBe(false);
    expect(overview.lastSevenDays.at(-1)?.mark).toBe('PENDING');
    expect(overview.lastSevenDays[0]?.mark).toBe('DONE');
  });

  it('counts days since the latest relapse and marks it in the week', () => {
    const overview = summarizeHabitOverview(
      quit({ relapseDays: days('2026-10-20', '2026-10-30') }),
      TODAY,
    );

    expect(overview.currentStreak).toBe(3);
    expect(overview.lastSevenDays[3]).toEqual({
      date: '2026-10-30',
      mark: 'MISSED',
    });
  });

  it('marks days before the quit started as untracked', () => {
    const overview = summarizeHabitOverview(
      quit({ quitStartedOn: '2026-10-31' }),
      TODAY,
    );

    expect(overview.currentStreak).toBe(2);
    expect(overview.lastSevenDays.map((day) => day.mark)).toEqual([
      'UNTRACKED',
      'UNTRACKED',
      'UNTRACKED',
      'UNTRACKED',
      'DONE',
      'DONE',
      'PENDING',
    ]);
  });
});
