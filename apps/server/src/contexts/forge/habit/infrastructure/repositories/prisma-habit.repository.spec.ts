import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
  HabitType as PrismaHabitType,
} from '@repo/database';

import { HabitType } from '../../domain/enums';
import { Habit } from '../../domain/habit.aggregate';
import {
  HabitCalendarDate,
  HabitFrequency,
  HabitId,
} from '../../domain/value-objects';
import { PrismaHabitRepository } from './prisma-habit.repository';

const TODAY = HabitCalendarDate.fromPersistenceDate(
  new Date('2026-10-09T00:00:00.000Z'),
);

describe('PrismaHabitRepository', () => {
  const transactionClient = {
    habit: {
      updateMany: jest.fn(),
    },
    habitLifecycleTransition: {
      createMany: jest.fn(),
    },
  };

  const habitModel = {
    create: jest.fn(),
    findFirst: jest.fn(),
  };

  type TransactionCallback = (
    transaction: typeof transactionClient,
  ) => Promise<unknown>;

  const prisma = {
    habit: habitModel,
    $transaction: jest.fn((callback: TransactionCallback) =>
      callback(transactionClient),
    ),
  };

  const repository = new PrismaHabitRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('persists the complete aggregate state including createdOn', async () => {
      habitModel.create.mockResolvedValue(rawHabit());

      await repository.create(createDomainHabit());

      expect(habitModel.create).toHaveBeenCalledWith({
        data: rawHabit(),
      });
    });
  });

  describe('update', () => {
    it('updates only the owned Habit at the expected revision', async () => {
      transactionClient.habit.updateMany.mockResolvedValue({ count: 1 });
      const habit = createDomainHabit();
      habit.update({
        title: 'Evening walk',
        description: null,
        frequency: HabitFrequency.daily(),
      });

      const updated = await repository.update(habit, 4);

      expect(updated).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(transactionClient.habit.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'habit-id',
          ownerId: 'owner-id',
          revision: 4,
        },
        data: {
          title: 'Evening walk',
          description: null,
          frequencyType: PrismaHabitFrequencyType.DAILY,
          frequencyDays: [],
          quitStartedAt: null,
          isActive: true,
          revision: 5,
          updatedAt: habit.updatedAt,
        },
      });
      expect(
        transactionClient.habitLifecycleTransition.createMany,
      ).not.toHaveBeenCalled();
    });

    it('writes the lifecycle transition in the same transaction as the update', async () => {
      transactionClient.habit.updateMany.mockResolvedValue({ count: 1 });
      const habit = createDomainHabit();
      habit.archive(TODAY);

      const updated = await repository.update(habit, 4);

      expect(updated).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(transactionClient.habit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false, revision: 5 }),
        }),
      );
      expect(
        transactionClient.habitLifecycleTransition.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            habitId: 'habit-id',
            ownerId: 'owner-id',
            action: 'ARCHIVED',
            effectiveOn: new Date('2026-10-09T00:00:00.000Z'),
            occurredAt: expect.any(Date),
          },
        ],
      });
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('writes no transition when the revision is stale', async () => {
      transactionClient.habit.updateMany.mockResolvedValue({ count: 0 });
      const habit = createDomainHabit();
      habit.archive(TODAY);

      expect(await repository.update(habit, 3)).toBe(false);
      expect(
        transactionClient.habitLifecycleTransition.createMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findByIdForOwner', () => {
    it('scopes the lookup by both Habit ID and owner ID and loads the latest transition', async () => {
      habitModel.findFirst.mockResolvedValue(rawHabit());

      const habit = await repository.findByIdForOwner('habit-id', 'owner-id');

      expect(habitModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'habit-id',
          ownerId: 'owner-id',
        },
        include: {
          lifecycleTransitions: {
            select: { effectiveOn: true },
            orderBy: [{ effectiveOn: 'desc' }, { occurredAt: 'desc' }],
            take: 1,
          },
        },
      });
      expect(habit?.id).toBe('habit-id');
    });

    it('returns null when no owned Habit exists', async () => {
      habitModel.findFirst.mockResolvedValue(null);

      expect(
        await repository.findByIdForOwner('habit-id', 'different-owner'),
      ).toBeNull();
    });
  });
});

function createDomainHabit(): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk without headphones',
    type: HabitType.BUILD,
    frequency: HabitFrequency.weekly([1, 3, 5]),
    quitStartedAt: null,
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: HabitCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
    latestLifecycleEffectiveOn: null,
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  });
}

function rawHabit(): PrismaHabit {
  return {
    id: 'habit-id',
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk without headphones',
    type: PrismaHabitType.BUILD,
    frequencyType: PrismaHabitFrequencyType.WEEKLY,
    frequencyDays: [1, 3, 5],
    quitStartedAt: null,
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: new Date('2026-08-20T00:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  };
}
