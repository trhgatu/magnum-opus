import { ChroniclePeriodType } from '../enums';
import { InvalidChronicleMonthException } from '../exceptions';

import { ChroniclePeriod } from './chronicle-period.value-object';

describe('ChroniclePeriod', () => {
  describe('forMonth', () => {
    it('builds the canonical key and keeps the owner time zone', () => {
      const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');

      expect(period.type).toBe(ChroniclePeriodType.MONTH);
      expect(period.key).toBe('2026-09');
      expect(period.timeZone).toBe('Asia/Ho_Chi_Minh');
    });

    it('pads single-digit months in the key', () => {
      expect(ChroniclePeriod.forMonth(2026, 1, 'UTC').key).toBe('2026-01');
    });

    it('exposes date-only calendar boundaries independent of the time zone', () => {
      // Cột date-only (vd HabitCheckIn.date) đã lưu ngày lịch của owner
      // dưới dạng UTC-midnight, nên ranh giới ngày không đổi theo múi giờ.
      const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');

      expect(period.firstDate.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(period.endDate.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    });

    it('resolves instant boundaries at local midnight for a positive offset', () => {
      // 00:00 ngày 1/9 ở Việt Nam (UTC+7) là 17:00 ngày 31/8 theo UTC.
      const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');

      expect(period.start.toISOString()).toBe('2026-08-31T17:00:00.000Z');
      expect(period.end.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    });

    it('resolves instant boundaries at local midnight for a negative offset', () => {
      const period = ChroniclePeriod.forMonth(2026, 1, 'America/New_York');

      expect(period.start.toISOString()).toBe('2026-01-01T05:00:00.000Z');
      expect(period.end.toISOString()).toBe('2026-02-01T05:00:00.000Z');
    });

    it('uses the correct offset on each side of a DST change', () => {
      // New York: tháng 3 bắt đầu ở EST (UTC-5), tháng 4 bắt đầu ở EDT (UTC-4).
      const period = ChroniclePeriod.forMonth(2026, 3, 'America/New_York');

      expect(period.start.toISOString()).toBe('2026-03-01T05:00:00.000Z');
      expect(period.end.toISOString()).toBe('2026-04-01T04:00:00.000Z');
    });

    it('keeps UTC boundaries identical for the UTC time zone', () => {
      const period = ChroniclePeriod.forMonth(2026, 9, 'UTC');

      expect(period.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
      expect(period.end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    });

    it('rolls over into the next year when the month is December', () => {
      const period = ChroniclePeriod.forMonth(2026, 12, 'Asia/Ho_Chi_Minh');

      expect(period.key).toBe('2026-12');
      expect(period.endDate.toISOString()).toBe('2027-01-01T00:00:00.000Z');
      expect(period.end.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    });

    it.each([
      [2026, 0],
      [2026, 13],
      [2026, 1.5],
      [2026.5, 9],
      [Number.NaN, 9],
      [1969, 12],
      [999, 1],
      [10000, 1],
    ])('rejects an invalid year/month combination (%p, %p)', (year, month) => {
      expect(() => ChroniclePeriod.forMonth(year, month, 'UTC')).toThrow(
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
    it('uses the period time zone to decide the current month', () => {
      const now = new Date('2026-01-01T00:30:00.000Z');

      expect(
        ChroniclePeriod.forMonth(2025, 12, 'America/New_York').isCurrent(now),
      ).toBe(true);
      expect(ChroniclePeriod.forMonth(2025, 12, 'UTC').isCurrent(now)).toBe(
        false,
      );
    });

    it('is false for a past month', () => {
      const period = ChroniclePeriod.forMonth(2026, 8, 'UTC');
      const now = new Date('2026-09-15T12:00:00.000Z');

      expect(period.isCurrent(now)).toBe(false);
    });
  });

  describe('isInFuture', () => {
    it('is true when the period key is after the current month', () => {
      const period = ChroniclePeriod.forMonth(2026, 3, 'UTC');
      const now = new Date('2026-02-15T12:00:00.000Z');

      expect(period.isInFuture(now)).toBe(true);
    });

    it('treats the next local month as current, not future, right after local midnight', () => {
      // 2026-08-31T17:30Z đã là 00:30 ngày 1/9 ở Việt Nam.
      const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');
      const now = new Date('2026-08-31T17:30:00.000Z');

      expect(period.isInFuture(now)).toBe(false);
      expect(period.isCurrent(now)).toBe(true);
    });

    it('is false for the current month', () => {
      const period = ChroniclePeriod.forMonth(2026, 9, 'UTC');
      const now = new Date('2026-09-01T00:00:00.000Z');

      expect(period.isInFuture(now)).toBe(false);
    });

    it('is false for a past month', () => {
      const period = ChroniclePeriod.forMonth(2026, 1, 'UTC');
      const now = new Date('2026-09-15T12:00:00.000Z');

      expect(period.isInFuture(now)).toBe(false);
    });
  });

  describe('countableDays', () => {
    it('covers the whole month once it is closed', () => {
      const period = ChroniclePeriod.forMonth(2026, 8, 'Asia/Ho_Chi_Minh');
      const now = new Date('2026-09-15T03:00:00.000Z');

      expect(period.countableDays(now)).toEqual({
        from: '2026-08-01',
        to: '2026-09-01',
      });
    });

    it('stops after today in the owner time zone for the current month', () => {
      // 2026-09-14T18:00Z đã là 01:00 ngày 15/9 ở Việt Nam.
      const period = ChroniclePeriod.forMonth(2026, 9, 'Asia/Ho_Chi_Minh');
      const now = new Date('2026-09-14T18:00:00.000Z');

      expect(period.countableDays(now)).toEqual({
        from: '2026-09-01',
        to: '2026-09-16',
      });
    });
  });
});
