import { ChroniclePeriodType } from '../enums';
import { InvalidChronicleMonthException } from '../exceptions';

import { ChroniclePeriod } from './chronicle-period.value-object';

describe('ChroniclePeriod', () => {
  describe('forMonth', () => {
    it('builds the canonical key and UTC month boundaries', () => {
      const period = ChroniclePeriod.forMonth(2026, 9);

      expect(period.type).toBe(ChroniclePeriodType.MONTH);
      expect(period.key).toBe('2026-09');
      expect(period.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(period.end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    });

    it('pads single-digit months in the key', () => {
      expect(ChroniclePeriod.forMonth(2026, 1).key).toBe('2026-01');
    });

    it('rolls over into the next year when the month is December', () => {
      const period = ChroniclePeriod.forMonth(2026, 12);

      expect(period.key).toBe('2026-12');
      expect(period.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
      expect(period.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    });

    it.each([
      [2026, 0],
      [2026, 13],
      [2026, 1.5],
      [2026.5, 9],
      [Number.NaN, 9],
    ])('rejects an invalid year/month combination (%p, %p)', (year, month) => {
      expect(() => ChroniclePeriod.forMonth(year, month)).toThrow(
        InvalidChronicleMonthException,
      );
    });
  });

  describe('currentMonthKey', () => {
    it('resolves the calendar month for the given time zone', () => {
      // 2026-01-01T00:30:00Z là 2025-12-31 19:30 ở America/New_York (UTC-5)
      // — khác tháng với UTC, đúng ý nghĩa "hôm nay theo owner.timeZone".
      const now = new Date('2026-01-01T00:30:00.000Z');

      expect(ChroniclePeriod.currentMonthKey(now, 'UTC')).toBe('2026-01');
      expect(ChroniclePeriod.currentMonthKey(now, 'America/New_York')).toBe(
        '2025-12',
      );
    });
  });

  describe('isCurrent', () => {
    it('is true when the period key matches the current month in the time zone', () => {
      const period = ChroniclePeriod.forMonth(2025, 12);
      const now = new Date('2026-01-01T00:30:00.000Z');

      expect(period.isCurrent(now, 'America/New_York')).toBe(true);
      expect(period.isCurrent(now, 'UTC')).toBe(false);
    });

    it('is false for a past month', () => {
      const period = ChroniclePeriod.forMonth(2026, 8);
      const now = new Date('2026-09-15T12:00:00.000Z');

      expect(period.isCurrent(now, 'UTC')).toBe(false);
    });
  });

  describe('isInFuture', () => {
    it('is true when the period key is after the current month in the time zone', () => {
      const period = ChroniclePeriod.forMonth(2026, 3);
      const now = new Date('2026-02-15T12:00:00.000Z');

      expect(period.isInFuture(now, 'UTC')).toBe(true);
    });

    it('is false for the current month', () => {
      const period = ChroniclePeriod.forMonth(2026, 9);
      const now = new Date('2026-09-01T00:00:00.000Z');

      expect(period.isInFuture(now, 'UTC')).toBe(false);
    });

    it('is false for a past month', () => {
      const period = ChroniclePeriod.forMonth(2026, 1);
      const now = new Date('2026-09-15T12:00:00.000Z');

      expect(period.isInFuture(now, 'UTC')).toBe(false);
    });
  });
});
