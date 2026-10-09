import { RoutineCalendarDate } from './routine-calendar-date.value-object';

describe('RoutineCalendarDate', () => {
  it("resolves an instant to the owner's calendar date", () => {
    const instant = new Date('2026-10-08T18:00:00.000Z');

    expect(
      RoutineCalendarDate.fromInstant(instant, 'Asia/Ho_Chi_Minh').value,
    ).toBe('2026-10-09');
    expect(
      RoutineCalendarDate.fromInstant(instant, 'America/New_York').value,
    ).toBe('2026-10-08');
  });

  it('round-trips through a date-only persistence value', () => {
    const date = RoutineCalendarDate.fromPersistenceDate(
      new Date('2026-10-09T00:00:00.000Z'),
    );

    expect(date.value).toBe('2026-10-09');
    expect(date.toPersistenceDate()).toEqual(
      new Date('2026-10-09T00:00:00.000Z'),
    );
  });

  it('picks the later of a date and an optional floor', () => {
    const earlier = RoutineCalendarDate.fromPersistenceDate(
      new Date('2026-10-08T00:00:00.000Z'),
    );
    const later = RoutineCalendarDate.fromPersistenceDate(
      new Date('2026-10-09T00:00:00.000Z'),
    );

    expect(RoutineCalendarDate.latest(earlier, later)).toBe(later);
    expect(RoutineCalendarDate.latest(later, earlier)).toBe(later);
    expect(RoutineCalendarDate.latest(earlier, null)).toBe(earlier);
  });
});
