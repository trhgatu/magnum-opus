import { ChroniclePeriodType } from '../enums';

import { InvalidChronicleMonthException } from '../exceptions';

export class ChroniclePeriod {
  private constructor(
    public readonly type: ChroniclePeriodType,
    public readonly key: string,
    public readonly start: Date,
    public readonly end: Date,
  ) {}

  public static forMonth(year: number, month: number): ChroniclePeriod {
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new InvalidChronicleMonthException(year, month);
    }

    const key = `${year}-${String(month).padStart(2, '0')}`;
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(
      Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1),
    );

    return new ChroniclePeriod(ChroniclePeriodType.MONTH, key, start, end);
  }

  public static currentMonthKey(now: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);

    const part = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((candidate) => candidate.type === type)?.value ?? '';

    return `${part('year')}-${part('month')}`;
  }

  public isCurrent(now: Date, timeZone: string): boolean {
    return this.key === ChroniclePeriod.currentMonthKey(now, timeZone);
  }

  public isInFuture(now: Date, timeZone: string): boolean {
    return this.key > ChroniclePeriod.currentMonthKey(now, timeZone);
  }
}
