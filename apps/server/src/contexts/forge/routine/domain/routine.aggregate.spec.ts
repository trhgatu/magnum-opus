import {
  InvalidRoutineHabitIdException,
  InvalidRoutineHabitReorderException,
  InvalidRoutineTitleException,
  InvalidRoutineTransitionException,
  RoutineHabitAlreadyExistsException,
  RoutineHabitNotFoundException,
} from './exceptions';
import { RoutineLifecycleAction } from './enums';
import {
  RoutineHabitAddedEvent,
  RoutineHabitRemovedEvent,
  RoutineLifecycleTransitionedEvent,
} from './events';
import { Routine, type RoutineProps } from './routine.aggregate';
import { RoutineCalendarDate, RoutineId } from './value-objects';

const calendarDate = (value: string): RoutineCalendarDate =>
  RoutineCalendarDate.fromPersistenceDate(new Date(`${value}T00:00:00.000Z`));

const TODAY = calendarDate('2026-10-09');

const rehydrateRoutine = (overrides: Partial<RoutineProps> = {}): Routine =>
  Routine.rehydrate({
    id: new RoutineId('routine-1'),
    ownerId: 'owner-1',
    title: 'Morning',
    habitIds: [],
    isActive: true,
    revision: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    createdOn: calendarDate('2026-08-01'),
    latestLifecycleEffectiveOn: null,
    membershipFloors: new Map(),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    ...overrides,
  });

const rehydrateActiveRoutine = (
  habitIds: string[] = [],
  revision = 1,
): Routine => rehydrateRoutine({ habitIds, revision });

const lifecycleTransitions = (
  routine: Routine,
): { action: RoutineLifecycleAction; effectiveOn: string }[] =>
  routine
    .getDomainEvents()
    .filter(
      (event): event is RoutineLifecycleTransitionedEvent =>
        event instanceof RoutineLifecycleTransitionedEvent,
    )
    .map((event) => ({
      action: event.action,
      effectiveOn: event.effectiveOn.value,
    }));

type MembershipChange = {
  change: 'added' | 'removed';
  habitId: string;
  on: string;
};

const membershipChanges = (routine: Routine): MembershipChange[] =>
  routine.getDomainEvents().flatMap((event): MembershipChange[] => {
    if (event instanceof RoutineHabitAddedEvent) {
      return [
        { change: 'added', habitId: event.habitId, on: event.addedOn.value },
      ];
    }

    if (event instanceof RoutineHabitRemovedEvent) {
      return [
        {
          change: 'removed',
          habitId: event.habitId,
          on: event.removedOn.value,
        },
      ];
    }

    return [];
  });

describe('Routine', () => {
  describe('create', () => {
    it('creates an active empty Routine at revision 1', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning ritual',
      });

      expect(routine.id).toBeTruthy();
      expect(routine.ownerId).toBe('owner-1');
      expect(routine.title).toBe('Morning ritual');
      expect(routine.habitIds).toEqual([]);
      expect(routine.isActive).toBe(true);
      expect(routine.revision).toBe(1);
      expect(routine.createdAt).toBeInstanceOf(Date);
      expect(routine.createdOn.value).toBe('2026-10-09');
      expect(routine.updatedAt).toBeInstanceOf(Date);
      expect(routine.getDomainEvents()).toEqual([]);
    });

    it('normalizes surrounding whitespace from the title', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
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
            today: TODAY,
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
        today: TODAY,
        title: 'Morning',
      });

      routine.updateTitle('Evening');

      expect(routine.title).toBe('Evening');
      expect(routine.revision).toBe(2);
    });

    it('does not increment revision when normalized title is unchanged', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      routine.updateTitle('  Morning  ');

      expect(routine.title).toBe('Morning');
      expect(routine.revision).toBe(1);
    });

    it('does not update an archived Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      routine.archive(TODAY);

      expect(() => routine.updateTitle('Evening')).toThrow(
        InvalidRoutineTransitionException,
      );
    });
  });

  describe('archive and restore', () => {
    it('archives an active Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      routine.archive(TODAY);

      expect(routine.isActive).toBe(false);
      expect(routine.revision).toBe(2);
    });

    it('does not archive an already archived Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      routine.archive(TODAY);

      expect(() => routine.archive(TODAY)).toThrow(
        InvalidRoutineTransitionException,
      );
    });

    it('restores an archived Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      routine.archive(TODAY);
      routine.restore(TODAY);

      expect(routine.isActive).toBe(true);
      expect(routine.revision).toBe(3);
    });

    it('does not restore an active Routine', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      expect(() => routine.restore(TODAY)).toThrow(
        InvalidRoutineTransitionException,
      );
      expect(routine.getDomainEvents()).toEqual([]);
    });

    it('records one lifecycle transition per change, even on the same day', () => {
      const routine = rehydrateRoutine();

      routine.archive(TODAY);
      routine.restore(TODAY);

      const [archived] = routine.getDomainEvents();
      expect(archived).toMatchObject({
        routineId: 'routine-1',
        ownerId: 'owner-1',
      });
      expect(lifecycleTransitions(routine)).toEqual([
        { action: RoutineLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
        { action: RoutineLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('never moves effectiveOn before the latest recorded transition', () => {
      // Owner đổi múi giờ về phía tây: "hôm nay" mới sớm hơn mốc đã ghi.
      const routine = rehydrateRoutine({
        isActive: false,
        latestLifecycleEffectiveOn: calendarDate('2026-10-09'),
      });

      routine.restore(calendarDate('2026-10-08'));
      routine.archive(calendarDate('2026-10-08'));

      expect(lifecycleTransitions(routine)).toEqual([
        { action: RoutineLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
        { action: RoutineLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('never moves effectiveOn before createdOn', () => {
      const routine = rehydrateRoutine({ createdOn: TODAY });

      routine.archive(calendarDate('2026-10-08'));

      expect(lifecycleTransitions(routine)).toEqual([
        { action: RoutineLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('treats a newly created Routine as having a loaded, empty floor', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      routine.archive(TODAY);

      expect(lifecycleTransitions(routine)).toEqual([
        { action: RoutineLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('fails loudly on archive/restore when the floor was not loaded', () => {
      const active = rehydrateRoutine({
        latestLifecycleEffectiveOn: undefined,
      });
      const archived = rehydrateRoutine({
        isActive: false,
        latestLifecycleEffectiveOn: undefined,
      });

      expect(() => active.archive(TODAY)).toThrow(
        'Routine lifecycle floor was not loaded',
      );
      expect(() => archived.restore(TODAY)).toThrow(
        'Routine lifecycle floor was not loaded',
      );
      expect(active.isActive).toBe(true);
      expect(active.revision).toBe(1);
      expect(active.getDomainEvents()).toEqual([]);
    });

    it('does not record a transition for membership or title changes', () => {
      const routine = rehydrateRoutine();

      routine.updateTitle('Evening');
      routine.addHabit('habit-1', TODAY);

      expect(lifecycleTransitions(routine)).toEqual([]);
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
        createdOn: calendarDate('2026-08-01'),
        latestLifecycleEffectiveOn: calendarDate('2026-08-02'),
        membershipFloors: new Map(),
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
        createdOn: '2026-08-01',
        updatedAt,
      });
    });

    it('does not expose its internal Habit ID array', () => {
      const sourceHabitIds = ['habit-1'];

      const routine = rehydrateRoutine({ habitIds: sourceHabitIds });

      sourceHabitIds.push('habit-2');

      const primitives = routine.toPrimitives();
      primitives.habitIds.push('habit-3');

      expect(routine.habitIds).toEqual(['habit-1']);
    });
  });
  describe('Habit membership', () => {
    it('adds a Habit to the end of the Routine', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      routine.addHabit('habit-2', TODAY);

      expect(routine.habitIds).toEqual(['habit-1', 'habit-2']);
      expect(routine.revision).toBe(2);
    });

    it('normalizes a Habit ID before adding it', () => {
      const routine = rehydrateActiveRoutine();

      routine.addHabit('  habit-1  ', TODAY);

      expect(routine.habitIds).toEqual(['habit-1']);
    });

    it('rejects an empty Habit ID', () => {
      const routine = rehydrateActiveRoutine();

      expect(() => routine.addHabit('   ', TODAY)).toThrow(
        InvalidRoutineHabitIdException,
      );
    });

    it('does not add the same Habit twice', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      expect(() => routine.addHabit('habit-1', TODAY)).toThrow(
        RoutineHabitAlreadyExistsException,
      );

      expect(routine.habitIds).toEqual(['habit-1']);
      expect(routine.revision).toBe(1);
    });

    it('removes a Habit and closes the order gap', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      routine.removeHabit('habit-2', TODAY);

      expect(routine.habitIds).toEqual(['habit-1', 'habit-3']);
      expect(routine.revision).toBe(2);
    });

    it('does not remove a missing Habit', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      expect(() => routine.removeHabit('habit-2', TODAY)).toThrow(
        RoutineHabitNotFoundException,
      );
    });
  });

  describe('Habit membership history', () => {
    it('records an added event dated today', () => {
      const routine = rehydrateActiveRoutine();

      routine.addHabit('  habit-1  ', TODAY);

      const [event] = routine.getDomainEvents();
      expect(event).toBeInstanceOf(RoutineHabitAddedEvent);
      expect(event).toMatchObject({
        routineId: 'routine-1',
        ownerId: 'owner-1',
        habitId: 'habit-1',
      });
      expect(membershipChanges(routine)).toEqual([
        { change: 'added', habitId: 'habit-1', on: '2026-10-09' },
      ]);
    });

    it('records a removed event dated today', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      routine.removeHabit('habit-1', TODAY);

      const [event] = routine.getDomainEvents();
      expect(event).toBeInstanceOf(RoutineHabitRemovedEvent);
      expect(event).toMatchObject({
        routineId: 'routine-1',
        ownerId: 'owner-1',
        habitId: 'habit-1',
      });
      expect(membershipChanges(routine)).toEqual([
        { change: 'removed', habitId: 'habit-1', on: '2026-10-09' },
      ]);
    });

    it('records every change in order, even on the same day', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      routine.removeHabit('habit-1', TODAY);
      routine.addHabit('habit-1', TODAY);

      expect(membershipChanges(routine)).toEqual([
        { change: 'removed', habitId: 'habit-1', on: '2026-10-09' },
        { change: 'added', habitId: 'habit-1', on: '2026-10-09' },
      ]);
      expect(routine.habitIds).toEqual(['habit-1']);
      expect(routine.revision).toBe(3);
    });

    it('never dates a re-add before the latest recorded change of that Habit', () => {
      // Habit đã được gỡ vào 10-12 (owner từng ở múi giờ phía đông hơn).
      const routine = rehydrateRoutine({
        membershipFloors: new Map([['habit-1', calendarDate('2026-10-12')]]),
      });

      routine.addHabit('habit-1', TODAY);

      expect(membershipChanges(routine)).toEqual([
        { change: 'added', habitId: 'habit-1', on: '2026-10-12' },
      ]);
    });

    it('does not clamp a Habit by another Habit floor', () => {
      const routine = rehydrateRoutine({
        habitIds: ['habit-2'],
        membershipFloors: new Map([['habit-1', calendarDate('2026-10-12')]]),
      });

      routine.addHabit('habit-3', TODAY);
      routine.removeHabit('habit-2', TODAY);

      expect(membershipChanges(routine)).toEqual([
        { change: 'added', habitId: 'habit-3', on: '2026-10-09' },
        { change: 'removed', habitId: 'habit-2', on: '2026-10-09' },
      ]);
    });

    it('never dates a change before createdOn', () => {
      const routine = rehydrateRoutine({ createdOn: TODAY });

      routine.addHabit('habit-1', calendarDate('2026-10-08'));

      expect(membershipChanges(routine)).toEqual([
        { change: 'added', habitId: 'habit-1', on: '2026-10-09' },
      ]);
    });

    it('keeps dates monotonic when the owner moves west within one aggregate', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      routine.removeHabit('habit-1', TODAY);
      // Owner đổi múi giờ về phía tây: "hôm nay" lùi về 10-08.
      routine.addHabit('habit-1', calendarDate('2026-10-08'));

      expect(membershipChanges(routine)).toEqual([
        { change: 'removed', habitId: 'habit-1', on: '2026-10-09' },
        { change: 'added', habitId: 'habit-1', on: '2026-10-09' },
      ]);
    });

    it('treats a newly created Routine as having loaded, empty floors', () => {
      const routine = Routine.create({
        ownerId: 'owner-1',
        today: TODAY,
        title: 'Morning',
      });

      routine.addHabit('habit-1', calendarDate('2026-10-10'));

      expect(membershipChanges(routine)).toEqual([
        { change: 'added', habitId: 'habit-1', on: '2026-10-10' },
      ]);
    });

    it('fails loudly on add/remove when the floors were not loaded', () => {
      const routine = rehydrateRoutine({
        habitIds: ['habit-1'],
        membershipFloors: undefined,
      });

      expect(() => routine.addHabit('habit-2', TODAY)).toThrow(
        'Routine membership floors were not loaded',
      );
      expect(() => routine.removeHabit('habit-1', TODAY)).toThrow(
        'Routine membership floors were not loaded',
      );
      expect(routine.habitIds).toEqual(['habit-1']);
      expect(routine.revision).toBe(1);
      expect(routine.getDomainEvents()).toEqual([]);
    });

    it('still reports domain errors before the not-loaded guard', () => {
      const routine = rehydrateRoutine({
        habitIds: ['habit-1'],
        membershipFloors: undefined,
      });

      expect(() => routine.addHabit('habit-1', TODAY)).toThrow(
        RoutineHabitAlreadyExistsException,
      );
      expect(() => routine.removeHabit('habit-2', TODAY)).toThrow(
        RoutineHabitNotFoundException,
      );
      expect(() => routine.addHabit('   ', TODAY)).toThrow(
        InvalidRoutineHabitIdException,
      );
    });

    it('does not record membership events when reordering', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      routine.reorderHabits(['habit-3', 'habit-1', 'habit-2']);
      routine.moveHabitUp('habit-2');
      routine.moveHabitDown('habit-3');

      expect(routine.revision).toBe(4);
      expect(routine.getDomainEvents()).toEqual([]);
    });

    it('does not record events for rejected changes', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      expect(() => routine.addHabit('habit-1', TODAY)).toThrow(
        RoutineHabitAlreadyExistsException,
      );
      expect(() => routine.removeHabit('habit-2', TODAY)).toThrow(
        RoutineHabitNotFoundException,
      );

      expect(routine.getDomainEvents()).toEqual([]);
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

    it('reorders every Habit at once', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      routine.reorderHabits(['habit-3', 'habit-1', 'habit-2']);

      expect(routine.habitIds).toEqual(['habit-3', 'habit-1', 'habit-2']);
      expect(routine.revision).toBe(2);
    });

    it('does not change revision when the reordered list is identical', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      routine.reorderHabits(['habit-1', 'habit-2', 'habit-3']);

      expect(routine.habitIds).toEqual(['habit-1', 'habit-2', 'habit-3']);
      expect(routine.revision).toBe(1);
    });

    it('rejects a reorder that drops a Habit', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      expect(() => routine.reorderHabits(['habit-1', 'habit-2'])).toThrow(
        InvalidRoutineHabitReorderException,
      );
      expect(routine.habitIds).toEqual(['habit-1', 'habit-2', 'habit-3']);
      expect(routine.revision).toBe(1);
    });

    it('rejects a reorder that duplicates a Habit', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2', 'habit-3']);

      expect(() =>
        routine.reorderHabits(['habit-1', 'habit-1', 'habit-3']),
      ).toThrow(InvalidRoutineHabitReorderException);
    });

    it('rejects a reorder that introduces a foreign Habit', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2']);

      expect(() => routine.reorderHabits(['habit-1', 'habit-99'])).toThrow(
        InvalidRoutineHabitReorderException,
      );
    });

    it('does not reorder an archived Routine', () => {
      const routine = rehydrateActiveRoutine(['habit-1', 'habit-2']);

      routine.archive(TODAY);

      expect(() => routine.reorderHabits(['habit-2', 'habit-1'])).toThrow(
        InvalidRoutineTransitionException,
      );
    });

    it('does not change membership of an archived Routine', () => {
      const routine = rehydrateActiveRoutine(['habit-1']);

      routine.archive(TODAY);

      expect(() => routine.addHabit('habit-2', TODAY)).toThrow(
        InvalidRoutineTransitionException,
      );

      expect(() => routine.removeHabit('habit-1', TODAY)).toThrow(
        InvalidRoutineTransitionException,
      );

      expect(() => routine.moveHabitDown('habit-1')).toThrow(
        InvalidRoutineTransitionException,
      );
    });
  });
});
