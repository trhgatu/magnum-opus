// Ngày lịch date-only (YYYY-MM-DD) của owner. Được chốt theo múi giờ owner
// ở tầng application rồi mới truyền vào aggregate; sau đó chỉ so ngày với
// ngày, không quy đổi múi giờ lần nào nữa.
export class RoutineCalendarDate {
  private constructor(public readonly value: string) {}

  public static fromInstant(
    instant: Date,
    timeZone: string,
  ): RoutineCalendarDate {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const part = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((candidate) => candidate.type === type)?.value ?? '';

    return new RoutineCalendarDate(
      `${part('year')}-${part('month')}-${part('day')}`,
    );
  }

  public static fromPersistenceDate(date: Date): RoutineCalendarDate {
    return new RoutineCalendarDate(date.toISOString().slice(0, 10));
  }

  public static latest(
    date: RoutineCalendarDate,
    floor: RoutineCalendarDate | null,
  ): RoutineCalendarDate {
    return floor !== null && floor.isAfter(date) ? floor : date;
  }

  public isAfter(other: RoutineCalendarDate): boolean {
    return this.value > other.value;
  }

  public equals(other: RoutineCalendarDate): boolean {
    return this.value === other.value;
  }

  public toPersistenceDate(): Date {
    return new Date(`${this.value}T00:00:00.000Z`);
  }

  public toString(): string {
    return this.value;
  }
}
