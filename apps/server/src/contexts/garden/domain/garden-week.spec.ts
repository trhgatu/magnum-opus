import type { CalendarDay } from '@shared/domain/calendar-day';

import type { GardenRhythm } from './garden-entry';
import {
  type GardenLedgerRow,
  type GardenWeek,
  gardenWeeks,
  WEEDS_MAX,
  weedsAfter,
} from './garden-week';

// Ví dụ kiểm chứng của BA §8.8: hôm nay thứ Ba 10/11/2026.
const TODAY = '2026-11-10';

const row = (
  kind: GardenLedgerRow['kind'],
  occurredOn: CalendarDay,
  extra: Partial<GardenLedgerRow> = {},
): GardenLedgerRow => ({
  kind,
  occurredOn,
  mark: null,
  detail: null,
  ...extra,
});
const rhythm = (occurredOn: CalendarDay, detail: GardenRhythm) =>
  row('RHYTHM_SET', occurredOn, { detail });
const scar = (occurredOn: CalendarDay) =>
  row('MARKED', occurredOn, { mark: 'SCAR' });
const tended = (...days: CalendarDay[]) =>
  days.map((day) => row('TENDED', day));

const DAILY: GardenRhythm = { type: 'DAILY', days: [] };
const MON_WED_FRI: GardenRhythm = { type: 'WEEKLY', days: [1, 3, 5] };

const statuses = (weeks: GardenWeek[]) =>
  Object.fromEntries(weeks.map((week) => [week.start, week.status]));

describe('gardenWeeks (BA §8.8)', () => {
  it('1. a daily BUILD tended every week is CARED, the current week PENDING', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-10-05',
      today: TODAY,
      entries: [
        rhythm('2026-10-05', DAILY),
        ...tended(
          '2026-10-06',
          '2026-10-14',
          '2026-10-20',
          '2026-10-28',
          '2026-11-03',
        ),
      ],
    });

    expect(weeks.map((week) => week.status)).toEqual([
      'CARED',
      'CARED',
      'CARED',
      'CARED',
      'CARED',
      'PENDING',
    ]);
  });

  it('2. a scheduled week without a check-in is RESTED', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-10-12',
      today: TODAY,
      entries: [
        rhythm('2026-10-12', MON_WED_FRI),
        ...tended('2026-10-12', '2026-10-26'),
      ],
    });

    expect(statuses(weeks)).toMatchObject({
      '2026-10-12': 'CARED',
      '2026-10-19': 'RESTED',
      // Chăm lại sau một tuần RESTED: garden-sim vẽ mắt gỗ từ chuỗi này.
      '2026-10-26': 'CARED',
    });
  });

  it('3. a check-in off the schedule still cares for the week', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-10-12',
      today: TODAY,
      entries: [rhythm('2026-10-12', MON_WED_FRI), ...tended('2026-11-01')],
    });

    expect(statuses(weeks)['2026-10-26']).toBe('CARED');
  });

  it('4. archived days are skipped and grow no weeds', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-10-05',
      today: TODAY,
      entries: [
        rhythm('2026-10-05', MON_WED_FRI),
        ...tended('2026-10-05', '2026-10-12'),
        row('RESTED', '2026-10-22'),
        row('RESUMED', '2026-11-02'),
      ],
    });

    expect(statuses(weeks)).toMatchObject({
      // Chỉ xét thứ 2–4 của tuần 19/10: thứ 2 và thứ 4 đến lịch, không chăm.
      '2026-10-19': 'RESTED',
      '2026-10-26': 'SKIPPED',
      '2026-11-02': 'RESTED',
    });
    expect(weedsAfter(weeks)).toBe(0);
  });

  it('5. a QUIT week with two relapses is CARED with one scar', () => {
    const weeks = gardenWeeks({
      variant: 'QUIT',
      plantedOn: '2026-10-05',
      today: TODAY,
      entries: [scar('2026-10-24'), scar('2026-10-24')],
    });

    expect(weeks.find((week) => week.start === '2026-10-19')).toEqual({
      start: '2026-10-19',
      status: 'CARED',
      scarred: true,
    });
    expect(weeks.filter((week) => week.scarred)).toHaveLength(1);
    expect(weeks.every((week) => week.status === 'CARED')).toBe(true);
  });

  it("6. a scar falls in the week of the owner's day", () => {
    // 23:50 Chủ nhật 25/10 giờ Việt Nam: nguồn đã ghi ngày 25/10.
    const weeks = gardenWeeks({
      variant: 'QUIT',
      plantedOn: '2026-10-05',
      today: TODAY,
      entries: [scar('2026-10-25')],
    });

    expect(weeks.find((week) => week.scarred)?.start).toBe('2026-10-19');
  });

  it('7. a check-in undone the same day leaves the week RESTED', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-10-26',
      today: TODAY,
      entries: [
        rhythm('2026-10-26', DAILY),
        row('TENDED', '2026-10-30'),
        row('UNTENDED', '2026-10-30'),
      ],
    });

    expect(statuses(weeks)['2026-10-26']).toBe('RESTED');
  });

  it('8. three RESTED weeks in a row start growing weeds', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-10-12',
      today: TODAY,
      entries: [rhythm('2026-10-12', DAILY), ...tended('2026-10-12')],
    });

    expect(weeks.map((week) => week.status)).toEqual([
      'CARED',
      'RESTED',
      'RESTED',
      'RESTED',
      'PENDING',
    ]);
    expect(weedsAfter(weeks)).toBe(1);
  });

  it('9. a replanted QUIT tree starts from its new day and ignores older scars', () => {
    const weeks = gardenWeeks({
      variant: 'QUIT',
      plantedOn: '2026-10-15',
      today: TODAY,
      entries: [scar('2026-10-08')],
    });

    expect(weeks[0].start).toBe('2026-10-12');
    expect(weeks.some((week) => week.scarred)).toBe(false);
  });
});

describe('gardenWeeks edges', () => {
  it('lets the latest rhythm recorded on a day win', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-11-02',
      today: TODAY,
      entries: [
        rhythm('2026-11-02', DAILY),
        // Đổi sang chỉ Chủ nhật ngay trong ngày gieo.
        rhythm('2026-11-02', { type: 'WEEKLY', days: [7] }),
      ],
    });

    // Tuần 02/11 vẫn có Chủ nhật đến lịch nên RESTED; nhịp hằng ngày bị thay.
    expect(statuses(weeks)['2026-11-02']).toBe('RESTED');
  });

  it('skips a BUILD week with no scheduled day and no check-in', () => {
    const weeks = gardenWeeks({
      variant: 'BUILD',
      plantedOn: '2026-11-02',
      today: TODAY,
      entries: [rhythm('2026-11-02', { type: 'WEEKLY', days: [] })],
    });

    expect(weeks.map((week) => week.status)).toEqual(['SKIPPED', 'SKIPPED']);
  });

  it('returns no weeks before the planting day', () => {
    expect(
      gardenWeeks({
        variant: 'QUIT',
        plantedOn: '2026-11-11',
        today: TODAY,
        entries: [],
      }),
    ).toEqual([]);
  });
});

describe('weedsAfter', () => {
  const weeks = (...list: GardenWeek['status'][]): GardenWeek[] =>
    list.map((status, index) => ({
      start: `2026-01-${String(index + 1).padStart(2, '0')}`,
      status,
      scarred: false,
    }));

  it('caps the weeds and trims them one step per cared week', () => {
    const neglected = weeks(...Array<GardenWeek['status']>(10).fill('RESTED'));
    expect(weedsAfter(neglected)).toBe(WEEDS_MAX);
    expect(weedsAfter([...neglected, ...weeks('CARED', 'CARED')])).toBe(
      WEEDS_MAX - 2,
    );
  });

  it('lets a skipped week break the count without trimming', () => {
    expect(
      weedsAfter(weeks('RESTED', 'RESTED', 'SKIPPED', 'RESTED', 'RESTED')),
    ).toBe(0);
    expect(
      weedsAfter(weeks('RESTED', 'RESTED', 'RESTED', 'SKIPPED', 'PENDING')),
    ).toBe(1);
  });
});
