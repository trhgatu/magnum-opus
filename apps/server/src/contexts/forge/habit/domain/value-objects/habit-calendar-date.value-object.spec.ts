import { HabitCalendarDate } from './habit-calendar-date.value-object';

describe('HabitCalendarDate', () => {
  it("resolves an instant to the owner's calendar date", () => {
    const instant = new Date('2026-10-08T18:00:00.000Z');

    expect(
      HabitCalendarDate.fromInstant(instant, 'Asia/Ho_Chi_Minh').value,
    ).toBe('2026-10-09');
    expect(
      HabitCalendarDate.fromInstant(instant, 'America/New_York').value,
    ).toBe('2026-10-08');
  });

  it('round-trips through a date-only persistence value', () => {
    const date = HabitCalendarDate.fromPersistenceDate(
      new Date('2026-10-09T00:00:00.000Z'),
    );

    expect(date.value).toBe('2026-10-09');
    expect(date.toPersistenceDate()).toEqual(
      new Date('2026-10-09T00:00:00.000Z'),
    );
  });

  it('picks the later of a date and an optional floor', () => {
    const earlier = HabitCalendarDate.fromPersistenceDate(
      new Date('2026-10-08T00:00:00.000Z'),
    );
    const later = HabitCalendarDate.fromPersistenceDate(
      new Date('2026-10-09T00:00:00.000Z'),
    );

    expect(HabitCalendarDate.latest(earlier, later)).toBe(later);
    expect(HabitCalendarDate.latest(later, earlier)).toBe(later);
    expect(HabitCalendarDate.latest(earlier, null)).toBe(earlier);
  });
});
