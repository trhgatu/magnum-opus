import {
  addDays,
  calendarDayAt,
  calendarDayOf,
  calendarDayToDate,
  daysBetween,
  eachDay,
  isoWeekday,
} from './calendar-day';

describe('calendar-day', () => {
  it('resolves the calendar day of an instant in a time zone', () => {
    const instant = new Date('2026-08-31T17:30:00.000Z');

    expect(calendarDayAt(instant, 'Asia/Ho_Chi_Minh')).toBe('2026-09-01');
    expect(calendarDayAt(instant, 'UTC')).toBe('2026-08-31');
  });

  it('round-trips date-only columns', () => {
    const date = new Date('2026-09-15T00:00:00.000Z');

    expect(calendarDayOf(date)).toBe('2026-09-15');
    expect(calendarDayToDate('2026-09-15')).toEqual(date);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts calendar days between two days', () => {
    expect(daysBetween('2026-08-01', '2026-09-10')).toBe(40);
    expect(daysBetween('2026-09-10', '2026-09-10')).toBe(0);
  });

  it('returns ISO weekdays with Sunday as 7', () => {
    expect(isoWeekday('2026-09-14')).toBe(1);
    expect(isoWeekday('2026-09-20')).toBe(7);
  });

  it('lists every day of a half-open range', () => {
    expect(eachDay('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ]);
    expect(eachDay('2026-09-10', '2026-09-10')).toEqual([]);
  });
});
