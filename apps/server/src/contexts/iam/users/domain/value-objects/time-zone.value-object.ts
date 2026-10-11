import { InvalidTimeZoneException } from '../exceptions/invalid-time-zone.exception';

const MAX_LENGTH = 64;

export class TimeZone {
  public static readonly DEFAULT = 'UTC';

  public readonly value: string;

  constructor(value: string) {
    if (!TimeZone.isValid(value)) {
      throw new InvalidTimeZoneException(value);
    }
    this.value = value.trim();
  }
  public static isValid(value: string | undefined | null): value is string {
    const candidate = value?.trim() ?? '';

    if (
      !candidate ||
      candidate.length > MAX_LENGTH ||
      /^[+-]|^GMT[+-]/i.test(candidate)
    ) {
      return false;
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: candidate });
      return true;
    } catch {
      return false;
    }
  }
}
