import {
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import { Routine } from '../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../domain/value-objects';
import { PrismaRoutineWithHabits } from '../mappers/prisma-routine.mapper';
import { PrismaRoutineRepository } from './prisma-routine.repository';

const TODAY = RoutineCalendarDate.fromPersistenceDate(
  new Date('2026-10-09T00:00:00.000Z'),
);

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
    routineLifecycleTransition: {
      createMany: jest.fn(),
    },
    routineHabitMembership: {
      create: jest.fn(),
      updateMany: jest.fn(),
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

      expect(
        transactionClient.routineLifecycleTransition.createMany,
      ).not.toHaveBeenCalled();
    });

    it('writes the lifecycle transition in the same transaction as the update', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 1,
      });

      const routine = createDomainRoutine();
      routine.archive(TODAY);

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      expect(transactionClient.routine.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false, revision: 5 }),
        }),
      );

      expect(
        transactionClient.routineLifecycleTransition.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            routineId: 'routine-id',
            ownerId: 'owner-id',
            action: 'ARCHIVED',
            effectiveOn: new Date('2026-10-09T00:00:00.000Z'),
            occurredAt: expect.any(Date),
          },
        ],
      });
      expect(
        transactionClient.routineHabitMembership.create,
      ).not.toHaveBeenCalled();
      expect(
        transactionClient.routineHabitMembership.updateMany,
      ).not.toHaveBeenCalled();
      expect(routine.getDomainEvents()).toEqual([]);
    });

    it('opens a membership row for an added Habit in the same transaction', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 1,
      });

      const routine = createDomainRoutine();
      routine.addHabit('habit-third', TODAY);

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(
        transactionClient.routineHabitMembership.create,
      ).toHaveBeenCalledWith({
        data: {
          routineId: 'routine-id',
          habitId: 'habit-third',
          ownerId: 'owner-id',
          addedOn: new Date('2026-10-09T00:00:00.000Z'),
        },
      });
      expect(
        transactionClient.routineHabitMembership.updateMany,
      ).not.toHaveBeenCalled();
      expect(routine.getDomainEvents()).toEqual([]);
    });

    it('closes only the open membership row of a removed Habit', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 1,
      });

      const routine = createDomainRoutine();
      routine.removeHabit('habit-first', TODAY);

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(true);
      expect(
        transactionClient.routineHabitMembership.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          routineId: 'routine-id',
          habitId: 'habit-first',
          ownerId: 'owner-id',
          removedOn: null,
        },
        data: { removedOn: new Date('2026-10-09T00:00:00.000Z') },
      });
      expect(
        transactionClient.routineHabitMembership.create,
      ).not.toHaveBeenCalled();
    });

    it('writes membership changes in event order', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 1,
      });

      // Gỡ rồi thêm lại cùng Habit: phải đóng khoảng cũ trước khi mở khoảng
      // mới, nếu không partial unique index (1 khoảng mở / cặp) sẽ chặn.
      const routine = createDomainRoutine();
      routine.removeHabit('habit-first', TODAY);
      routine.addHabit('habit-first', TODAY);

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(true);

      const { create, updateMany } = transactionClient.routineHabitMembership;
      expect(updateMany).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        create.mock.invocationCallOrder[0],
      );
      expect(
        transactionClient.routine.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(updateMany.mock.invocationCallOrder[0]);
    });

    it('writes no membership history when revision is stale', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 0,
      });

      const routine = createDomainRoutine();
      routine.removeHabit('habit-first', TODAY);
      routine.addHabit('habit-third', TODAY);

      const updated = await repository.update(routine, 4);

      expect(updated).toBe(false);
      expect(
        transactionClient.routineHabitMembership.create,
      ).not.toHaveBeenCalled();
      expect(
        transactionClient.routineHabitMembership.updateMany,
      ).not.toHaveBeenCalled();
      expect(transactionClient.routineHabit.deleteMany).not.toHaveBeenCalled();
    });

    it('returns false without replacing memberships when revision is stale', async () => {
      transactionClient.routine.updateMany.mockResolvedValue({
        count: 0,
      });

      const routine = createDomainRoutine();
      routine.archive(TODAY);

      const updated = await repository.update(routine, 3);

      expect(updated).toBe(false);

      expect(transactionClient.routineHabit.deleteMany).not.toHaveBeenCalled();

      expect(transactionClient.routineHabit.createMany).not.toHaveBeenCalled();

      expect(
        transactionClient.routineLifecycleTransition.createMany,
      ).not.toHaveBeenCalled();
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
      routine.removeHabit('habit-first', TODAY);
      routine.removeHabit('habit-second', TODAY);

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
          lifecycleTransitions: {
            select: { effectiveOn: true },
            orderBy: [{ effectiveOn: 'desc' }, { occurredAt: 'desc' }],
            take: 1,
          },
          membershipHistory: {
            select: { habitId: true, addedOn: true, removedOn: true },
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
        createdOn: '2026-08-20',
        updatedAt: new Date('2026-08-21T10:00:00.000Z'),
      });
    });

    it('loads membership floors so the Routine can add/remove Habits', async () => {
      routineModel.findFirst.mockResolvedValue({
        ...rawRoutineWithHabits(),
        lifecycleTransitions: [],
        membershipHistory: [
          {
            habitId: 'habit-first',
            addedOn: new Date('2026-10-12T00:00:00.000Z'),
            removedOn: null,
          },
        ],
      });

      const routine = await repository.findByIdForOwner(
        'routine-id',
        'owner-id',
      );
      routine?.removeHabit('habit-first', TODAY);

      expect(routine?.getDomainEvents()).toEqual([
        expect.objectContaining({
          habitId: 'habit-first',
          removedOn: RoutineCalendarDate.fromPersistenceDate(
            new Date('2026-10-12T00:00:00.000Z'),
          ),
        }),
      ]);
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
    createdOn: RoutineCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
    latestLifecycleEffectiveOn: null,
    membershipFloors: new Map(),
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
    createdOn: new Date('2026-08-20T00:00:00.000Z'),
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
