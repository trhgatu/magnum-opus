import { HabitFrequencyType } from '../enums';
import { InvalidHabitFrequencyException } from '../exceptions';

export interface HabitFrequencyPrimitives {
  type: HabitFrequencyType;
  days: number[];
}

export class HabitFrequency {
  private constructor(
    public readonly type: HabitFrequencyType,
    private readonly weekdayValues: readonly number[],
  ) {}

  public static create(
    type: HabitFrequencyType,
    days: readonly number[] = [],
  ): HabitFrequency {
    if (type === HabitFrequencyType.DAILY) {
      if (days.length !== 0) {
        throw new InvalidHabitFrequencyException();
      }

      return HabitFrequency.daily();
    }

    if (type === HabitFrequencyType.WEEKLY) {
      return HabitFrequency.weekly(days);
    }

    throw new InvalidHabitFrequencyException();
  }

  public static daily(): HabitFrequency {
    return new HabitFrequency(HabitFrequencyType.DAILY, []);
  }

  public static weekly(days: readonly number[]): HabitFrequency {
    const normalizedDays = HabitFrequency.normalizeWeekdays(days);

    return new HabitFrequency(HabitFrequencyType.WEEKLY, normalizedDays);
  }

  public static rehydrate(
    type: HabitFrequencyType,
    days: readonly number[],
  ): HabitFrequency {
    if (type === HabitFrequencyType.DAILY) {
      if (days.length !== 0) {
        throw new InvalidHabitFrequencyException();
      }

      return HabitFrequency.daily();
    }

    if (type !== HabitFrequencyType.WEEKLY) {
      throw new InvalidHabitFrequencyException();
    }

    const normalizedDays = HabitFrequency.normalizeWeekdays(days);
    const isCanonical =
      normalizedDays.length === days.length &&
      normalizedDays.every((day, index) => day === days[index]);

    if (!isCanonical) {
      throw new InvalidHabitFrequencyException();
    }

    return new HabitFrequency(HabitFrequencyType.WEEKLY, normalizedDays);
  }

  public get days(): number[] {
    return [...this.weekdayValues];
  }

  public isDueOn(isoWeekday: number): boolean {
    HabitFrequency.ensureIsoWeekday(isoWeekday);

    return (
      this.type === HabitFrequencyType.DAILY ||
      this.weekdayValues.includes(isoWeekday)
    );
  }

  public equals(other: HabitFrequency): boolean {
    return (
      this.type === other.type &&
      this.weekdayValues.length === other.weekdayValues.length &&
      this.weekdayValues.every(
        (day, index) => day === other.weekdayValues[index],
      )
    );
  }

  public toPrimitives(): HabitFrequencyPrimitives {
    return {
      type: this.type,
      days: this.days,
    };
  }

  private static normalizeWeekdays(days: readonly number[]): number[] {
    if (days.length === 0) {
      throw new InvalidHabitFrequencyException();
    }

    days.forEach(HabitFrequency.ensureIsoWeekday);

    return [...new Set(days)].sort((first, second) => first - second);
  }

  private static ensureIsoWeekday(day: number): void {
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new InvalidHabitFrequencyException();
    }
  }
}
