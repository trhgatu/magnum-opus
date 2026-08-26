import {
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import { Routine } from '../../domain/routine.aggregate';
import { RoutineId } from '../../domain/value-objects';
import { PrismaRoutineWithHabits } from '../mappers/prisma-routine.mapper';
import { PrismaRoutineRepository } from './prisma-routine.repository';

describe('PrismaRoutineRepository', () => {
  const transactionClient = {
    routine: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    routineHabit: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const routineModel = {
    findFirst: jest.fn(),
  };

  type TransactionCallback = (
    transaction: typeof transactionClient,
  ) => Promise<unknown>;

  const prisma = {
    routine: routineModel,
    $transaction: jest.fn((callback: TransactionCallback) =>
      callback(transactionClient),
    ),
  };

  const repository = new PrismaRoutineRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('persists the Routine and its ordered Habit memberships atomically', async () => {
      transactionClient.routine.create.mockResolvedValue(rawRoutine());
      transactionClient.routineHabit.createMany.mockResolvedValue({
        count: 2,
      });

      await repository.create(createDomainRoutine());

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      expect(transactionClient.routine.create).toHaveBeenCalledWith({
        data: rawRoutine(),
      });

      expect(transactionClient.routineHabit.createMany).toHaveBeenCalledWith({
        data: rawMemberships(),
      });
    });

    it('does not create memberships for an empty Routine', async () => {
      transactionClient.routine.create.mockResolvedValue(rawRoutine());

      await repository.create(createDomainRoutine([]));

      expect(transactionClient.routine.create).toHaveBeenCalledWith({
        data: rawRoutine(),
      });

      expect(transactionClient.routineHabit.createMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the owned Routine at the expected revision', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 1,
      });
      transactionClient.routineHabit.deleteMany.mockResolvedValue({
        count: 2,
      });
      transactionClient.routineHabit.createMany.mockResolvedValue({
        count: 2,
      });

      const routine = createDomainRoutine();
      routine.updateTitle('Evening ritual');

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(true);

      expect(transactionClient.routine.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'routine-id',
          ownerId: 'owner-id',
          revision: 4,
        },
        data: {
          title: 'Evening ritual',
          isActive: true,
          revision: 5,
          updatedAt: routine.updatedAt,
        },
      });

      expect(transactionClient.routineHabit.deleteMany).toHaveBeenCalledWith({
        where: {
          routineId: 'routine-id',
          ownerId: 'owner-id',
        },
      });

      expect(transactionClient.routineHabit.createMany).toHaveBeenCalledWith({
        data: rawMemberships(),
      });
    });

    it('returns false without replacing memberships when revision is stale', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 0,
      });

      const updated = await repository.update(createDomainRoutine(), 3);

      expect(updated).toBe(false);

      expect(transactionClient.routineHabit.deleteMany).not.toHaveBeenCalled();

      expect(transactionClient.routineHabit.createMany).not.toHaveBeenCalled();
    });

    it('persists the new order after moving a Habit', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 1,
      });
      transactionClient.routineHabit.deleteMany.mockResolvedValue({
        count: 2,
      });
      transactionClient.routineHabit.createMany.mockResolvedValue({
        count: 2,
      });

      const routine = createDomainRoutine();
      routine.moveHabitDown('habit-first');

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(true);

      expect(transactionClient.routineHabit.createMany).toHaveBeenCalledWith({
        data: [
          {
            routineId: 'routine-id',
            habitId: 'habit-second',
            ownerId: 'owner-id',
            order: 1,
          },
          {
            routineId: 'routine-id',
            habitId: 'habit-first',
            ownerId: 'owner-id',
            order: 2,
          },
        ],
      });
    });

    it('does not recreate memberships when the Routine becomes empty', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 1,
      });
      transactionClient.routineHabit.deleteMany.mockResolvedValue({
        count: 2,
      });

      const routine = createDomainRoutine();
      routine.removeHabit('habit-first');
      routine.removeHabit('habit-second');

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(true);

      expect(transactionClient.routineHabit.deleteMany).toHaveBeenCalledWith({
        where: {
          routineId: 'routine-id',
          ownerId: 'owner-id',
        },
      });

      expect(transactionClient.routineHabit.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findByIdForOwner', () => {
    it('loads an owned Routine with ordered Habit memberships', async () => {
      routineModel.findFirst.mockResolvedValue(rawRoutineWithHabits());

      const routine = await repository.findByIdForOwner(
        'routine-id',
        'owner-id',
      );

      expect(routineModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'routine-id',
          ownerId: 'owner-id',
        },
        include: {
          habits: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      expect(routine?.toPrimitives()).toEqual({
        id: 'routine-id',
        ownerId: 'owner-id',
        title: 'Morning ritual',
        habitIds: ['habit-first', 'habit-second'],
        isActive: true,
        revision: 4,
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
        updatedAt: new Date('2026-08-21T10:00:00.000Z'),
      });
    });

    it('returns null when no owned Routine exists', async () => {
      routineModel.findFirst.mockResolvedValue(null);

      expect(
        await repository.findByIdForOwner('routine-id', 'different-owner'),
      ).toBeNull();
    });
  });
});

function createDomainRoutine(
  habitIds: string[] = ['habit-first', 'habit-second'],
): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds,
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  });
}

function rawRoutine(): PrismaRoutine {
  return {
    id: 'routine-id',
    ownerId: 'owner-id',
    title: 'Morning ritual',
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  };
}

function rawMemberships(): PrismaRoutineHabit[] {
  return [
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
  ];
}

function rawRoutineWithHabits(): PrismaRoutineWithHabits {
  return {
    ...rawRoutine(),
    habits: rawMemberships(),
  };
}
