import {
  addDays,
  calendarDayAt,
  eachDayInclusive,
  startOfDay,
} from './calendar-day';

describe('calendar-day', () => {
  it('reads the calendar day in the account time zone', () => {
    const instant = new Date('2026-09-30T17:30:00.000Z');

    expect(calendarDayAt(instant, 'Asia/Ho_Chi_Minh')).toBe('2026-10-01');
    expect(calendarDayAt(instant, 'UTC')).toBe('2026-09-30');
    expect(calendarDayAt(instant, 'America/New_York')).toBe('2026-09-30');
  });

  it('finds midnight of a day in the account time zone', () => {
    expect(startOfDay('2026-10-01', 'Asia/Ho_Chi_Minh')).toEqual(
      new Date('2026-09-30T17:00:00.000Z'),
    );
    expect(startOfDay('2026-10-01', 'UTC')).toEqual(
      new Date('2026-10-01T00:00:00.000Z'),
    );
  });

  it('handles the days daylight saving time changes', () => {
    // New York: 08/03/2026 giờ mùa hè bắt đầu (UTC−5 → UTC−4),
    // 01/11/2026 kết thúc (UTC−4 → UTC−5).
    expect(startOfDay('2026-03-08', 'America/New_York')).toEqual(
      new Date('2026-03-08T05:00:00.000Z'),
    );
    expect(startOfDay('2026-03-09', 'America/New_York')).toEqual(
      new Date('2026-03-09T04:00:00.000Z'),
    );
    expect(startOfDay('2026-11-02', 'America/New_York')).toEqual(
      new Date('2026-11-02T05:00:00.000Z'),
    );
  });

  it('steps across months and lists days inclusively', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(eachDayInclusive('2026-09-29', '2026-10-01')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ]);
    expect(eachDayInclusive('2026-10-01', '2026-10-01')).toEqual([
      '2026-10-01',
    ]);
  });
});
