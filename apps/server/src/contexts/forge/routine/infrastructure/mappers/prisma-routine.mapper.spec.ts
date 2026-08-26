import {
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import { Routine } from '../../domain/routine.aggregate';
import { RoutineId } from '../../domain/value-objects';

import {
  PrismaRoutineMapper,
  type PrismaRoutineWithHabits,
} from './prisma-routine.mapper';

describe('PrismaRoutineMapper', () => {
  const createdAt = new Date('2026-08-20T10:00:00.000Z');
  const updatedAt = new Date('2026-08-21T10:00:00.000Z');

  const rawRoutine: PrismaRoutine = {
    id: 'routine-id',
    ownerId: 'owner-id',
    title: 'Morning ritual',
    isActive: true,
    revision: 4,
    createdAt,
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

  it('does not mutate the Prisma relation array while sorting', () => {
    PrismaRoutineMapper.toDomain(raw);

    expect(raw.habits.map((membership) => membership.order)).toEqual([2, 1]);
  });
});
