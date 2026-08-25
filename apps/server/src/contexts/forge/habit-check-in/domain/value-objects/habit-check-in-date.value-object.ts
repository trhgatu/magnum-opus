import { InvalidHabitCheckInDateException } from '../exceptions';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class HabitCheckInDate {
  private constructor(public readonly value: string) {}

  public static create(value: string): HabitCheckInDate {
    const match = DATE_PATTERN.exec(value);
    if (!match) {
      throw new InvalidHabitCheckInDateException(value);
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new InvalidHabitCheckInDateException(value);
    }

    return new HabitCheckInDate(value);
  }

  public static fromInstant(instant: Date, timeZone: string): HabitCheckInDate {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const part = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((candidate) => candidate.type === type)?.value ?? '';

    return HabitCheckInDate.create(
      `${part('year')}-${part('month')}-${part('day')}`,
    );
  }

  public toPersistenceDate(): Date {
    return new Date(`${this.value}T00:00:00.000Z`);
  }
}
