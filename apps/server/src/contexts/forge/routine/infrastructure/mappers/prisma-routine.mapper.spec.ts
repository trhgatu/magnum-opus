import {
  ForgeLifecycleAction as PrismaForgeLifecycleAction,
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import { RoutineLifecycleTransitionedEvent } from '../../domain/events';
import { Routine } from '../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../domain/value-objects';

import {
  PrismaRoutineMapper,
  type PrismaRoutineWithHabits,
} from './prisma-routine.mapper';

const TODAY = RoutineCalendarDate.fromPersistenceDate(
  new Date('2026-10-09T00:00:00.000Z'),
);

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

  it('does not mutate the Prisma relation array while sorting', () => {
    PrismaRoutineMapper.toDomain(raw);

    expect(raw.habits.map((membership) => membership.order)).toEqual([2, 1]);
  });
});
