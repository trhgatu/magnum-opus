import { InvalidHabitCheckInDateException } from '../exceptions';
import { HabitCheckInDate } from './habit-check-in-date.value-object';

describe('HabitCheckInDate', () => {
  it('accepts a real canonical calendar date', () => {
    expect(HabitCheckInDate.create('2028-02-29').value).toBe('2028-02-29');
  });

  it.each(['2026-2-01', '2026-02-30', 'not-a-date'])(
    'rejects invalid date %s',
    (value) => {
      expect(() => HabitCheckInDate.create(value)).toThrow(
        InvalidHabitCheckInDateException,
      );
    },
  );

  it('derives different calendar dates from the same instant by timezone', () => {
    const instant = new Date('2026-01-01T00:30:00.000Z');

    expect(HabitCheckInDate.fromInstant(instant, 'Asia/Bangkok').value).toBe(
      '2026-01-01',
    );
    expect(
      HabitCheckInDate.fromInstant(instant, 'America/Los_Angeles').value,
    ).toBe('2025-12-31');
  });

  it('maps a calendar date to UTC midnight only for Prisma persistence', () => {
    expect(
      HabitCheckInDate.create('2026-08-25').toPersistenceDate().toISOString(),
    ).toBe('2026-08-25T00:00:00.000Z');
  });
});
