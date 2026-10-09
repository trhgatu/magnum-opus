import {
  ForgeLifecycleAction as PrismaForgeLifecycleAction,
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import {
  RoutineHabitAddedEvent,
  RoutineHabitRemovedEvent,
  RoutineLifecycleTransitionedEvent,
} from '../../domain/events';
import { Routine } from '../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../domain/value-objects';

import {
  PrismaRoutineMapper,
  type PrismaRoutineWithHabits,
} from './prisma-routine.mapper';

const calendarDate = (value: string): RoutineCalendarDate =>
  RoutineCalendarDate.fromPersistenceDate(new Date(`${value}T00:00:00.000Z`));

const TODAY = calendarDate('2026-10-09');

const membershipDates = (routine: Routine): Record<string, string> => {
  const dates: Record<string, string> = {};

  for (const event of routine.getDomainEvents()) {
    if (event instanceof RoutineHabitAddedEvent) {
      dates[event.habitId] = event.addedOn.value;
    }

    if (event instanceof RoutineHabitRemovedEvent) {
      dates[event.habitId] = event.removedOn.value;
    }
  }

  return dates;
};

describe('PrismaRoutineMapper', () => {
  const createdAt = new Date('2026-08-20T10:00:00.000Z');
  const createdOn = new Date('2026-08-20T00:00:00.000Z');
  const updatedAt = new Date('2026-08-21T10:00:00.000Z');

  const rawRoutine: PrismaRoutine = {
    id: 'routine-id',
    ownerId: 'owner-id',
    title: 'Morning ritual',
    isActive: true,
    revision: 4,
    createdAt,
    createdOn,
    updatedAt,
  };

  const rawMemberships: PrismaRoutineHabit[] = [
    {
      routineId: 'routine-id',
      habitId: 'habit-second',
      ownerId: 'owner-id',
      order: 2,
    },
    {
      routineId: 'routine-id',
      habitId: 'habit-first',
      ownerId: 'owner-id',
      order: 1,
    },
  ];

  const raw: PrismaRoutineWithHabits = {
    ...rawRoutine,
    habits: rawMemberships,
  };

  it('maps a Prisma record to an ordered domain aggregate', () => {
    const routine = PrismaRoutineMapper.toDomain(raw);

    expect(routine.toPrimitives()).toEqual({
      id: 'routine-id',
      ownerId: 'owner-id',
      title: 'Morning ritual',
      habitIds: ['habit-first', 'habit-second'],
      isActive: true,
      revision: 4,
      createdAt,
      createdOn: '2026-08-20',
      updatedAt,
    });

    expect(routine.getDomainEvents()).toEqual([]);
  });

  it('maps the aggregate to the Routine row and ordered memberships', () => {
    const routine = Routine.rehydrate({
      id: new RoutineId('routine-id'),
      ownerId: 'owner-id',
      title: 'Morning ritual',
      habitIds: ['habit-first', 'habit-second'],
      isActive: true,
      revision: 4,
      createdAt,
      createdOn: RoutineCalendarDate.fromPersistenceDate(createdOn),
      latestLifecycleEffectiveOn: null,
      membershipFloors: new Map(),
      updatedAt,
    });

    expect(PrismaRoutineMapper.toPersistence(routine)).toEqual({
      routine: rawRoutine,
      habits: [
        {
          routineId: 'routine-id',
          habitId: 'habit-first',
          ownerId: 'owner-id',
          order: 1,
        },
        {
          routineId: 'routine-id',
          habitId: 'habit-second',
          ownerId: 'owner-id',
          order: 2,
        },
      ],
    });
  });

  it('round-trips the Routine row through the domain aggregate', () => {
    expect(
      PrismaRoutineMapper.toPersistence(PrismaRoutineMapper.toDomain(raw))
        .routine,
    ).toEqual(rawRoutine);
  });

  it('uses the loaded latest transition as the effectiveOn floor', () => {
    const routine = PrismaRoutineMapper.toDomain({
      ...raw,
      isActive: false,
      lifecycleTransitions: [
        { effectiveOn: new Date('2026-10-09T00:00:00.000Z') },
      ],
    });

    routine.restore(
      RoutineCalendarDate.fromPersistenceDate(
        new Date('2026-10-08T00:00:00.000Z'),
      ),
    );

    const [event] =
      routine.getDomainEvents() as RoutineLifecycleTransitionedEvent[];
    expect(event.effectiveOn.value).toBe('2026-10-09');
  });

  it('treats loaded-but-empty transitions as having no floor', () => {
    const routine = PrismaRoutineMapper.toDomain({
      ...raw,
      lifecycleTransitions: [],
    });

    routine.archive(TODAY);

    const [event] =
      routine.getDomainEvents() as RoutineLifecycleTransitionedEvent[];
    expect(event.effectiveOn.value).toBe('2026-10-09');
  });

  it('refuses archive/restore when the lifecycle floor was not loaded', () => {
    // Reader không nạp lifecycleTransitions: aggregate chỉ dùng để hiển thị.
    const active = PrismaRoutineMapper.toDomain(raw);
    const archived = PrismaRoutineMapper.toDomain({ ...raw, isActive: false });

    expect(() => active.archive(TODAY)).toThrow(
      'Routine lifecycle floor was not loaded',
    );
    expect(() => archived.restore(TODAY)).toThrow(
      'Routine lifecycle floor was not loaded',
    );
    expect(active.isActive).toBe(true);
    expect(active.revision).toBe(4);
    expect(active.getDomainEvents()).toEqual([]);
  });

  it.each([
    ['ARCHIVED', true, (routine: Routine) => routine.archive(TODAY)],
    ['RESTORED', false, (routine: Routine) => routine.restore(TODAY)],
  ] as const)(
    'maps a %s transition event to a persistence row',
    (action, isActive, change) => {
      const routine = PrismaRoutineMapper.toDomain({
        ...raw,
        isActive,
        lifecycleTransitions: [],
      });
      change(routine);
      const [event] =
        routine.getDomainEvents() as RoutineLifecycleTransitionedEvent[];

      expect(PrismaRoutineMapper.transitionToPersistence(event)).toEqual({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        action: PrismaForgeLifecycleAction[action],
        effectiveOn: new Date('2026-10-09T00:00:00.000Z'),
        occurredAt: event.occurredOn,
      });
    },
  );

  describe('membership floors', () => {
    it('refuses add/remove when the membership history was not loaded', () => {
      // Reader không nạp membershipHistory: aggregate chỉ dùng để hiển thị.
      const routine = PrismaRoutineMapper.toDomain(raw);

      expect(() => routine.addHabit('habit-new', TODAY)).toThrow(
        'Routine membership floors were not loaded',
      );
      expect(() => routine.removeHabit('habit-first', TODAY)).toThrow(
        'Routine membership floors were not loaded',
      );
      expect(routine.revision).toBe(4);
    });

    it('treats a loaded-but-empty history as having no floors', () => {
      const routine = PrismaRoutineMapper.toDomain({
        ...raw,
        membershipHistory: [],
      });

      routine.addHabit('habit-new', TODAY);
      routine.removeHabit('habit-first', TODAY);

      expect(membershipDates(routine)).toEqual({
        'habit-new': '2026-10-09',
        'habit-first': '2026-10-09',
      });
    });

    it('uses the latest addedOn/removedOn of each Habit as its floor', () => {
      const routine = PrismaRoutineMapper.toDomain({
        ...raw,
        membershipHistory: [
          {
            habitId: 'habit-first',
            addedOn: new Date('2026-10-11T00:00:00.000Z'),
            removedOn: null,
          },
          {
            habitId: 'habit-first',
            addedOn: new Date('2026-09-01T00:00:00.000Z'),
            removedOn: new Date('2026-10-10T00:00:00.000Z'),
          },
          {
            habitId: 'habit-gone',
            addedOn: new Date('2026-09-01T00:00:00.000Z'),
            removedOn: new Date('2026-10-12T00:00:00.000Z'),
          },
          {
            habitId: 'habit-second',
            addedOn: new Date('2026-08-20T00:00:00.000Z'),
            removedOn: null,
          },
        ],
      });

      routine.removeHabit('habit-first', TODAY);
      routine.addHabit('habit-gone', TODAY);
      routine.removeHabit('habit-second', TODAY);
      routine.addHabit('habit-new', calendarDate('2026-09-01'));

      expect(membershipDates(routine)).toEqual({
        'habit-first': '2026-10-11',
        'habit-gone': '2026-10-12',
        'habit-second': '2026-10-09',
        'habit-new': '2026-09-01',
      });
    });

    it('maps an added event to an open membership row', () => {
      const event = new RoutineHabitAddedEvent(
        'routine-id',
        'owner-id',
        'habit-first',
        TODAY,
      );

      expect(PrismaRoutineMapper.membershipOpeningToPersistence(event)).toEqual(
        {
          routineId: 'routine-id',
          habitId: 'habit-first',
          ownerId: 'owner-id',
          addedOn: new Date('2026-10-09T00:00:00.000Z'),
        },
      );
    });

    it('maps a removed event to a membership closing', () => {
      const event = new RoutineHabitRemovedEvent(
        'routine-id',
        'owner-id',
        'habit-first',
        TODAY,
      );

      expect(PrismaRoutineMapper.membershipClosingToPersistence(event)).toEqual(
        {
          routineId: 'routine-id',
          habitId: 'habit-first',
          ownerId: 'owner-id',
          removedOn: new Date('2026-10-09T00:00:00.000Z'),
        },
      );
    });
  });

  it('does not mutate the Prisma relation array while sorting', () => {
    PrismaRoutineMapper.toDomain(raw);

    expect(raw.habits.map((membership) => membership.order)).toEqual([2, 1]);
  });
});
