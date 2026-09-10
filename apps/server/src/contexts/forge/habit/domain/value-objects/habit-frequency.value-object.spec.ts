import { HabitFrequencyType } from '../enums';
import { InvalidHabitFrequencyException } from '../exceptions';

import { HabitFrequency } from './habit-frequency.value-object';

describe('HabitFrequency', () => {
  describe('create', () => {
    it('creates the requested frequency type', () => {
      expect(
        HabitFrequency.create(HabitFrequencyType.WEEKLY, [5, 1]).days,
      ).toEqual([1, 5]);
    });

    it('rejects weekdays attached to DAILY input', () => {
      expect(() =>
        HabitFrequency.create(HabitFrequencyType.DAILY, [1]),
      ).toThrow(InvalidHabitFrequencyException);
    });
  });

  describe('daily', () => {
    it('creates a daily frequency with no weekdays', () => {
      const frequency = HabitFrequency.daily();

      expect(frequency.type).toBe(HabitFrequencyType.DAILY);
      expect(frequency.days).toEqual([]);
      expect(frequency.isDueOn(1)).toBe(true);
      expect(frequency.isDueOn(7)).toBe(true);
    });
  });

  describe('weekly', () => {
    it('sorts and removes duplicate ISO weekdays', () => {
      const frequency = HabitFrequency.weekly([7, 1, 3, 1]);

      expect(frequency.type).toBe(HabitFrequencyType.WEEKLY);
      expect(frequency.days).toEqual([1, 3, 7]);
      expect(frequency.isDueOn(3)).toBe(true);
      expect(frequency.isDueOn(2)).toBe(false);
    });

    it('does not expose its internal weekday collection', () => {
      const frequency = HabitFrequency.weekly([1, 3]);
      const days = frequency.days;

      days.push(7);

      expect(frequency.days).toEqual([1, 3]);
    });

    it.each([{ days: [] }, { days: [0] }, { days: [8] }, { days: [1.5] }])(
      'rejects invalid weekdays $days',
      ({ days }) => {
        expect(() => HabitFrequency.weekly(days)).toThrow(
          InvalidHabitFrequencyException,
        );
      },
    );
  });

  describe('rehydrate', () => {
    it('restores canonical persisted values', () => {
      expect(
        HabitFrequency.rehydrate(
          HabitFrequencyType.WEEKLY,
          [1, 3, 7],
        ).toPrimitives(),
      ).toEqual({
        type: HabitFrequencyType.WEEKLY,
        days: [1, 3, 7],
      });
    });

    it('rejects weekdays attached to DAILY', () => {
      expect(() =>
        HabitFrequency.rehydrate(HabitFrequencyType.DAILY, [1]),
      ).toThrow(InvalidHabitFrequencyException);
    });

    it.each([{ days: [3, 1] }, { days: [1, 1] }])(
      'rejects non-canonical persisted weekdays $days',
      ({ days }) => {
        expect(() =>
          HabitFrequency.rehydrate(HabitFrequencyType.WEEKLY, days),
        ).toThrow(InvalidHabitFrequencyException);
      },
    );
  });

  it('compares type and normalized weekdays by value', () => {
    expect(
      HabitFrequency.weekly([3, 1]).equals(HabitFrequency.weekly([1, 3])),
    ).toBe(true);
    expect(HabitFrequency.daily().equals(HabitFrequency.weekly([1]))).toBe(
      false,
    );
  });

  it('rejects an invalid weekday when evaluating a schedule', () => {
    expect(() => HabitFrequency.daily().isDueOn(0)).toThrow(
      InvalidHabitFrequencyException,
    );
  });
});
