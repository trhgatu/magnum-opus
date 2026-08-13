import { MemoryDatePrecision } from '../enums';
import { InvalidMemoryOccurredOnException } from '../exceptions';

import { MemoryOccurredOn } from './memory-occurred-on.value-object';

describe('MemoryOccurredOn', () => {
  describe('unknown', () => {
    it('represents an unknown occurrence date', () => {
      const occurredOn = MemoryOccurredOn.unknown();

      expect(occurredOn.value).toBeNull();
      expect(occurredOn.precision).toBe(MemoryDatePrecision.UNKNOWN);
    });
  });

  describe('fromDay', () => {
    it('preserves a complete calendar date', () => {
      const occurredOn = MemoryOccurredOn.fromDay(2026, 8, 11);

      expect(occurredOn.value).toBe('2026-08-11');
      expect(occurredOn.precision).toBe(MemoryDatePrecision.DAY);
    });

    it('accepts a valid leap day', () => {
      const occurredOn = MemoryOccurredOn.fromDay(2024, 2, 29);

      expect(occurredOn.value).toBe('2024-02-29');
    });

    it('rejects a date that does not exist', () => {
      expect(() => MemoryOccurredOn.fromDay(2025, 2, 29)).toThrow(
        InvalidMemoryOccurredOnException,
      );

      expect(() => MemoryOccurredOn.fromDay(2026, 13, 1)).toThrow(
        InvalidMemoryOccurredOnException,
      );
    });
  });

  describe('partial dates', () => {
    it('normalizes a month to its first day', () => {
      const occurredOn = MemoryOccurredOn.fromMonth(2018, 8);

      expect(occurredOn.value).toBe('2018-08-01');
      expect(occurredOn.precision).toBe(MemoryDatePrecision.MONTH);
    });

    it('normalizes a year to its first day', () => {
      const occurredOn = MemoryOccurredOn.fromYear(2018);

      expect(occurredOn.value).toBe('2018-01-01');
      expect(occurredOn.precision).toBe(MemoryDatePrecision.YEAR);
    });
  });

  describe('rehydrate', () => {
    it('restores a normalized stored value', () => {
      const occurredOn = MemoryOccurredOn.rehydrate(
        '2018-08-01',
        MemoryDatePrecision.MONTH,
      );

      expect(occurredOn.value).toBe('2018-08-01');
      expect(occurredOn.precision).toBe(MemoryDatePrecision.MONTH);
    });

    it('rejects a value for unknown precision', () => {
      expect(() =>
        MemoryOccurredOn.rehydrate('2018-08-01', MemoryDatePrecision.UNKNOWN),
      ).toThrow(InvalidMemoryOccurredOnException);
    });

    it('rejects a missing value for known precision', () => {
      expect(() =>
        MemoryOccurredOn.rehydrate(null, MemoryDatePrecision.YEAR),
      ).toThrow(InvalidMemoryOccurredOnException);
    });

    it('rejects a non-normalized month', () => {
      expect(() =>
        MemoryOccurredOn.rehydrate('2018-08-17', MemoryDatePrecision.MONTH),
      ).toThrow(InvalidMemoryOccurredOnException);
    });

    it('rejects a non-normalized year', () => {
      expect(() =>
        MemoryOccurredOn.rehydrate('2018-08-01', MemoryDatePrecision.YEAR),
      ).toThrow(InvalidMemoryOccurredOnException);
    });

    it('rejects a non-canonical date string', () => {
      expect(() =>
        MemoryOccurredOn.rehydrate('2018-8-1', MemoryDatePrecision.DAY),
      ).toThrow(InvalidMemoryOccurredOnException);
    });
  });

  describe('equals', () => {
    it('compares both normalized date and precision', () => {
      const first = MemoryOccurredOn.fromMonth(2018, 8);
      const same = MemoryOccurredOn.fromMonth(2018, 8);
      const exactDay = MemoryOccurredOn.fromDay(2018, 8, 1);

      expect(first.equals(same)).toBe(true);
      expect(first.equals(exactDay)).toBe(false);
    });
  });
});
