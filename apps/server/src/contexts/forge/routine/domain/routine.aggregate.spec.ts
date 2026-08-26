import {
  InvalidRoutineHabitIdException,
  InvalidRoutineTitleException,
  InvalidRoutineTransitionException,
  RoutineHabitAlreadyExistsException,
  RoutineHabitNotFoundException,
} from './exceptions';
import { Routine } from './routine.aggregate';
import { RoutineId } from './value-objects';

const rehydrateActiveRoutine = (
  habitIds: string[] = [],
  revision = 1,
): Routine =>
  Routine.rehydrate({
    id: new RoutineId('routine-1'),
    ownerId: 'owner-1',
    title: 'Morning',
    habitIds,
    isActive: true,
    revision,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });

describe('Routine', () => {
  describe('create', () => {
    it('creates an active empty Routine at revision 1', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning ritual',
      });

      expect(routine.id).toBeTruthy();
      expect(routine.ownerId).toBe('owner-1');
      expect(routine.title).toBe('Morning ritual');
      expect(routine.habitIds).toEqual([]);
      expect(routine.isActive).toBe(true);
      expect(routine.revision).toBe(1);
      expect(routine.createdAt).toBeInstanceOf(Date);
      expect(routine.updatedAt).toBeInstanceOf(Date);
    });

    it('normalizes surrounding whitespace from the title', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: '  Morning ritual  ',
      });

      expect(routine.title).toBe('Morning ritual');
    });

    it.each(['', '   ', 'x'.repeat(201)])(
      'rejects an invalid title',
      (title) => {
        expect(() =>
          Routine.create({
            ownerId: 'owner-1',
            title,
          }),
        ).toThrow(InvalidRoutineTitleException);
      },
    );
  });

  describe('updateTitle', () => {
    it('updates the title and increments revision', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning',
      });

      routine.updateTitle('Evening');

      expect(routine.title).toBe('Evening');
      expect(routine.revision).toBe(2);
    });

    it('does not increment revision when normalized title is unchanged', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning',
      });

      routine.updateTitle('  Morning  ');

      expect(routine.title).toBe('Morning');
      expect(routine.revision).toBe(1);
    });

    it('does not update an archived Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning',
      });

      routine.archive();

      expect(() => routine.updateTitle('Evening')).toThrow(
        InvalidRoutineTransitionException,
      );
    });
  });

  describe('archive and restore', () => {
    it('archives an active Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning',
      });

      routine.archive();

      expect(routine.isActive).toBe(false);
      expect(routine.revision).toBe(2);
    });

    it('does not archive an already archived Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning',
      });

      routine.archive();

      expect(() => routine.archive()).toThrow(
        InvalidRoutineTransitionException,
      );
    });

    it('restores an archived Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning',
      });

      routine.archive();
      routine.restore();

      expect(routine.isActive).toBe(true);
      expect(routine.revision).toBe(3);
    });

    it('does not restore an active Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        title: 'Morning',
      });

      expect(() => routine.restore()).toThrow(
        InvalidRoutineTransitionException,
      );
    });
  });

  describe('rehydrate and primitives', () => {
    it('restores persisted state without changing revision', () => {
      const createdAt = new Date('2026-08-01T00:00:00.000Z');
      const updatedAt = new Date('2026-08-02T00:00:00.000Z');

      const routine = Routine.rehydrate({
        id: new RoutineId('routine-1'),
        ownerId: 'owner-1',
        title: 'Morning',
        habitIds: ['habit-1', 'habit-2'],
        isActive: false,
        revision: 7,
        createdAt,
        updatedAt,
      });

      expect(routine.toPrimitives()).toEqual({
        id: 'routine-1',
        ownerId: 'owner-1',
        title: 'Morning',
        habitIds: ['habit-1', 'habit-2'],
        isActive: false,
        revision: 7,
        createdAt,
        updatedAt,
      });
    });

    it('does not expose its internal Habit ID array', () => {
      const sourceHabitIds = ['habit-1'];

      const routine = Routine.rehydrate({
        id: new RoutineId('routine-1'),
        ownerId: 'owner-1',
        title: 'Morning',
        habitIds: sourceHabitIds,
        isActive: true,
        revision: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      sourceHabitIds.push('habit-2');

      const primitives = routine.toPrimitives();
      primitives.habitIds.push('habit-3');

      expect(routine.habitIds).toEqual(['habit-1']);
    });
  });
  describe('Habit membership', () => {
    it('adds a Habit to the end of the Routine', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      routine.addHabit('habit-2');

      expect(routine.habitIds).toEqual(['habit-1', 'habit-2']);
      expect(routine.revision).toBe(2);
    });

    it('normalizes a Habit ID before adding it', () => {
      const routine = rehydrateActiveRoutine();

      routine.addHabit('  habit-1  ');

      expect(routine.habitIds).toEqual(['habit-1']);
    });

    it('rejects an empty Habit ID', () => {
      const routine = rehydrateActiveRoutine();

      expect(() => routine.addHabit('   ')).toThrow(
        InvalidRoutineHabitIdException,
      );
    });

    it('does not add the same Habit twice', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      expect(() => routine.addHabit('habit-1')).toThrow(
        RoutineHabitAlreadyExistsException,
      );

      expect(routine.habitIds).toEqual(['habit-1']);
      expect(routine.revision).toBe(1);
    });

    it('removes a Habit and closes the order gap', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      routine.removeHabit('habit-2');

      expect(routine.habitIds).toEqual(['habit-1', 'habit-3']);
      expect(routine.revision).toBe(2);
    });

    it('does not remove a missing Habit', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      expect(() => routine.removeHabit('habit-2')).toThrow(
        RoutineHabitNotFoundException,
      );
    });
  });

  describe('Habit ordering', () => {
    it('moves a Habit up', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      routine.moveHabitUp('habit-3');

      expect(routine.habitIds).toEqual(['habit-1', 'habit-3', 'habit-2']);
      expect(routine.revision).toBe(2);
    });

    it('moves a Habit down', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      routine.moveHabitDown('habit-1');

      expect(routine.habitIds).toEqual(['habit-2', 'habit-1', 'habit-3']);
      expect(routine.revision).toBe(2);
    });

    it('does not change revision when moving beyond the first position', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2']);

      routine.moveHabitUp('habit-1');

      expect(routine.habitIds).toEqual(['habit-1', 'habit-2']);
      expect(routine.revision).toBe(1);
    });

    it('does not change revision when moving beyond the last position', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2']);

      routine.moveHabitDown('habit-2');

      expect(routine.habitIds).toEqual(['habit-1', 'habit-2']);
      expect(routine.revision).toBe(1);
    });

    it('does not move a missing Habit', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      expect(() => routine.moveHabitUp('habit-2')).toThrow(
        RoutineHabitNotFoundException,
      );
    });

    it('does not change membership of an archived Routine', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      routine.archive();

      expect(() => routine.addHabit('habit-2')).toThrow(
        InvalidRoutineTransitionException,
      );

      expect(() => routine.removeHabit('habit-1')).toThrow(
        InvalidRoutineTransitionException,
      );

      expect(() => routine.moveHabitDown('habit-1')).toThrow(
        InvalidRoutineTransitionException,
      );
    });
  });
});
