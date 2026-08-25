import {
  InvalidHabitTitleException,
  InvalidHabitTransitionException,
} from './exceptions';
import { Habit, type HabitProps } from './habit.aggregate';
import { HabitFrequency, HabitId } from './value-objects';

describe('Habit', () => {
  describe('create', () => {
    it('creates an active Habit at revision 1', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        title: '  Morning walk  ',
        description: '  Walk without headphones  ',
        frequency: HabitFrequency.daily(),
      });

      expect(habit.id).toBeTruthy();
      expect(habit.ownerId).toBe('owner-id');
      expect(habit.title).toBe('Morning walk');
      expect(habit.description).toBe('Walk without headphones');
      expect(habit.frequency.equals(HabitFrequency.daily())).toBe(true);
      expect(habit.isActive).toBe(true);
      expect(habit.revision).toBe(1);
      expect(habit.createdAt).toEqual(habit.updatedAt);
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('normalizes an omitted or blank description to null', () => {
      expect(createHabit().description).toBeNull();
      expect(createHabit({ description: '   ' }).description).toBeNull();
    });

    it('rejects a blank title', () => {
      expect(() => createHabit({ title: '   ' })).toThrow(
        InvalidHabitTitleException,
      );
    });

    it('rejects a title longer than 200 characters', () => {
      expect(() => createHabit({ title: 'a'.repeat(201) })).toThrow(
        InvalidHabitTitleException,
      );
    });
  });

  describe('update', () => {
    it('updates editable fields and increments revision', () => {
      const habit = createHabit();

      habit.update({
        title: '  Evening walk  ',
        description: '  After work  ',
        frequency: HabitFrequency.weekly([5, 1]),
      });

      expect(habit.title).toBe('Evening walk');
      expect(habit.description).toBe('After work');
      expect(habit.frequency.days).toEqual([1, 5]);
      expect(habit.revision).toBe(2);
    });

    it('does not increment revision for normalized equal values', () => {
      const habit = createHabit({
        description: 'Walk slowly',
        frequency: HabitFrequency.weekly([1, 5]),
      });

      habit.update({
        title: '  Morning walk  ',
        description: '  Walk slowly  ',
        frequency: HabitFrequency.weekly([5, 1]),
      });

      expect(habit.revision).toBe(1);
    });

    it('validates all new values before changing state', () => {
      const habit = createHabit();

      expect(() =>
        habit.update({
          title: '   ',
          description: 'Changed',
          frequency: HabitFrequency.weekly([1]),
        }),
      ).toThrow(InvalidHabitTitleException);
      expect(habit.title).toBe('Morning walk');
      expect(habit.description).toBeNull();
      expect(habit.revision).toBe(1);
    });

    it('does not allow editing an archived Habit', () => {
      const habit = createHabit();
      habit.archive();

      expect(() =>
        habit.update({
          title: 'Changed',
          frequency: HabitFrequency.daily(),
        }),
      ).toThrow(InvalidHabitTransitionException);
    });
  });

  describe('archive and restore', () => {
    it('archives an active Habit', () => {
      const habit = createHabit();

      habit.archive();

      expect(habit.isActive).toBe(false);
      expect(habit.revision).toBe(2);
    });

    it('restores an archived Habit', () => {
      const habit = createHabit();
      habit.archive();

      habit.restore();

      expect(habit.isActive).toBe(true);
      expect(habit.revision).toBe(3);
    });

    it('rejects archiving an archived Habit', () => {
      const habit = createHabit();
      habit.archive();

      expect(() => habit.archive()).toThrow(InvalidHabitTransitionException);
    });

    it('rejects restoring an active Habit', () => {
      expect(() => createHabit().restore()).toThrow(
        InvalidHabitTransitionException,
      );
    });
  });

  describe('schedule', () => {
    it('is due only on configured weekly days while active', () => {
      const habit = createHabit({
        frequency: HabitFrequency.weekly([1, 5]),
      });

      expect(habit.isDueOn(1)).toBe(true);
      expect(habit.isDueOn(2)).toBe(false);
    });

    it('is not due while archived', () => {
      const habit = createHabit();
      habit.archive();

      expect(habit.isDueOn(1)).toBe(false);
    });
  });

  describe('rehydrate and primitives', () => {
    it('rehydrates without changing persisted state', () => {
      const props = createProps({ isActive: false, revision: 7 });

      const habit = Habit.rehydrate(props);

      expect(habit.id).toBe('habit-id');
      expect(habit.isActive).toBe(false);
      expect(habit.revision).toBe(7);
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('converts the aggregate into persistence primitives', () => {
      const habit = Habit.rehydrate(createProps());

      expect(habit.toPrimitives()).toEqual({
        id: 'habit-id',
        ownerId: 'owner-id',
        title: 'Morning walk',
        description: 'Walk slowly',
        frequencyType: 'WEEKLY',
        frequencyDays: [1, 5],
        isActive: true,
        revision: 1,
        createdAt: new Date('2026-08-20T10:00:00Z'),
        updatedAt: new Date('2026-08-20T10:00:00Z'),
      });
    });
  });
});

function createHabit(
  overrides: Partial<{
    title: string;
    description: string | null;
    frequency: HabitFrequency;
  }> = {},
): Habit {
  return Habit.create({
    ownerId: 'owner-id',
    title: overrides.title ?? 'Morning walk',
    description: overrides.description,
    frequency: overrides.frequency ?? HabitFrequency.daily(),
  });
}

function createProps(overrides: Partial<HabitProps> = {}): HabitProps {
  return {
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk slowly',
    frequency: HabitFrequency.weekly([1, 5]),
    isActive: true,
    revision: 1,
    createdAt: new Date('2026-08-20T10:00:00Z'),
    updatedAt: new Date('2026-08-20T10:00:00Z'),
    ...overrides,
  };
}
