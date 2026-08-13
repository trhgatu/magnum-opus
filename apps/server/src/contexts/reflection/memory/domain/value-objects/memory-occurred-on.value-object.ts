import { MemoryDatePrecision } from '../enums';
import { InvalidMemoryOccurredOnException } from '../exceptions';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class MemoryOccurredOn {
  private constructor(
    public readonly value: string | null,
    public readonly precision: MemoryDatePrecision,
  ) {}

  public static unknown(): MemoryOccurredOn {
    return new MemoryOccurredOn(null, MemoryDatePrecision.UNKNOWN);
  }

  public static fromDay(
    year: number,
    month: number,
    day: number,
  ): MemoryOccurredOn {
    return new MemoryOccurredOn(
      this.toIsoDate(year, month, day),
      MemoryDatePrecision.DAY,
    );
  }

  public static fromMonth(year: number, month: number): MemoryOccurredOn {
    return new MemoryOccurredOn(
      this.toIsoDate(year, month, 1),
      MemoryDatePrecision.MONTH,
    );
  }

  public static fromYear(year: number): MemoryOccurredOn {
    return new MemoryOccurredOn(
      this.toIsoDate(year, 1, 1),
      MemoryDatePrecision.YEAR,
    );
  }

  public static rehydrate(
    value: string | null,
    precision: MemoryDatePrecision,
  ): MemoryOccurredOn {
    if (precision === MemoryDatePrecision.UNKNOWN) {
      if (value !== null) {
        throw new InvalidMemoryOccurredOnException();
      }

      return this.unknown();
    }

    if (value === null) {
      throw new InvalidMemoryOccurredOnException();
    }

    const match = ISO_DATE_PATTERN.exec(value);

    if (!match) {
      throw new InvalidMemoryOccurredOnException();
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const normalized = this.toIsoDate(year, month, day);

    if (normalized !== value) {
      throw new InvalidMemoryOccurredOnException();
    }

    if (precision === MemoryDatePrecision.MONTH && day !== 1) {
      throw new InvalidMemoryOccurredOnException();
    }

    if (precision === MemoryDatePrecision.YEAR && (month !== 1 || day !== 1)) {
      throw new InvalidMemoryOccurredOnException();
    }

    return new MemoryOccurredOn(value, precision);
  }

  public equals(other: MemoryOccurredOn): boolean {
    return this.value === other.value && this.precision === other.precision;
  }

  private static toIsoDate(year: number, month: number, day: number): string {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      year < 1 ||
      year > 9999 ||
      month < 1 ||
      month > 12
    ) {
      throw new InvalidMemoryOccurredOnException();
    }

    const maximumDay = this.daysInMonth(year, month);

    if (day < 1 || day > maximumDay) {
      throw new InvalidMemoryOccurredOnException();
    }

    return [
      year.toString().padStart(4, '0'),
      month.toString().padStart(2, '0'),
      day.toString().padStart(2, '0'),
    ].join('-');
  }

  private static daysInMonth(year: number, month: number): number {
    const days = [
      31,
      this.isLeapYear(year) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];

    return days[month - 1]!;
  }

  private static isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
}
