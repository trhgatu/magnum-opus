import { resolveTodayCalendarDate } from './today-calendar';

describe('resolveTodayCalendarDate', () => {
  it('resolves the business date in the owner timezone', () => {
    const result = resolveTodayCalendarDate(
      new Date('2026-08-30T17:30:00.000Z'),
      'Asia/Bangkok',
    );

    expect(result).toEqual({
      date: '2026-08-31',
      persistenceDate: new Date('2026-08-31T00:00:00.000Z'),
      isoWeekday: 1,
    });
  });

  it('keeps the previous calendar date west of UTC', () => {
    const result = resolveTodayCalendarDate(
      new Date('2026-08-31T02:30:00.000Z'),
      'America/New_York',
    );

    expect(result).toEqual({
      date: '2026-08-30',
      persistenceDate: new Date('2026-08-30T00:00:00.000Z'),
      isoWeekday: 7,
    });
  });

  it('maps Sunday to ISO weekday seven', () => {
    const result = resolveTodayCalendarDate(
      new Date('2026-08-30T12:00:00.000Z'),
      'UTC',
    );

    expect(result.isoWeekday).toBe(7);
  });

  it('rejects an invalid IANA timezone', () => {
    expect(() =>
      resolveTodayCalendarDate(
        new Date('2026-08-30T12:00:00.000Z'),
        'Invalid/TimeZone',
      ),
    ).toThrow(RangeError);
  });
});
