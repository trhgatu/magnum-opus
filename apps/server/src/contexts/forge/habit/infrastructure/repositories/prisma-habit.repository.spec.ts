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
  const calls: string[] = [];
  const track =
    <T>(name: string, value: T) =>
    () => {
      calls.push(name);

      return Promise.resolve(value);
    };

  const transactionClient = {
    habit: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    habitLifecycleTransition: {
      createMany: jest.fn(),
    },
    habitScheduleVersion: {
      create: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const habitModel = {
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
    calls.length = 0;
    transactionClient.habit.create.mockImplementation(
      track('habit.create', rawHabit()),
    );
    transactionClient.habitScheduleVersion.createMany.mockImplementation(
      track('scheduleVersion.createMany', { count: 1 }),
    );
    transactionClient.habitScheduleVersion.updateMany.mockImplementation(
      track('scheduleVersion.close', { count: 1 }),
    );
    transactionClient.habitScheduleVersion.create.mockImplementation(
      track('scheduleVersion.create', {}),
    );
  });

  describe('create', () => {
    it('persists the complete aggregate state including createdOn', async () => {
      await repository.create(createDomainHabit());

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(transactionClient.habit.create).toHaveBeenCalledWith({
        data: rawHabit(),
      });
      expect(
        transactionClient.habitScheduleVersion.createMany,
      ).not.toHaveBeenCalled();
    });

    it('writes the initial schedule version of a BUILD Habit in the same transaction', async () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        title: 'Morning walk',
        type: HabitType.BUILD,
        frequency: HabitFrequency.weekly([5, 1]),
        today: TODAY,
      });

      await repository.create(habit);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(['habit.create', 'scheduleVersion.createMany']);
      expect(
        transactionClient.habitScheduleVersion.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            habitId: habit.id,
            ownerId: 'owner-id',
            frequencyType: PrismaHabitFrequencyType.WEEKLY,
            frequencyDays: [1, 5],
            effectiveFrom: new Date('2026-10-09T00:00:00.000Z'),
          },
        ],
      });
      expect(
        transactionClient.habitScheduleVersion.updateMany,
      ).not.toHaveBeenCalled();
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('writes no schedule version for a QUIT Habit', async () => {
      await repository.create(
        Habit.create({
          ownerId: 'owner-id',
          title: 'Quit smoking',
          type: HabitType.QUIT,
          quitStartedAt: new Date('2026-08-01T00:00:00.000Z'),
          today: TODAY,
        }),
      );

      expect(transactionClient.habit.create).toHaveBeenCalledTimes(1);
      expect(
        transactionClient.habitScheduleVersion.createMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates only the owned Habit at the expected revision', async () => {
      transactionClient.habit.updateMany.mockResolvedValue({ count: 1 });
      const habit = createDomainHabit();
      habit.update({
        title: 'Evening walk',
        description: null,
        frequency: HabitFrequency.weekly([1, 3, 5]),
        today: TODAY,
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
          frequencyType: PrismaHabitFrequencyType.WEEKLY,
          frequencyDays: [1, 3, 5],
          quitStartedAt: null,
          isActive: true,
          revision: 5,
          updatedAt: habit.updatedAt,
        },
      });
      expect(
        transactionClient.habitLifecycleTransition.createMany,
      ).not.toHaveBeenCalled();
      expect(
        transactionClient.habitScheduleVersion.updateMany,
      ).not.toHaveBeenCalled();
      expect(
        transactionClient.habitScheduleVersion.create,
      ).not.toHaveBeenCalled();
    });

    it('closes the open schedule version and opens a new one in the same transaction', async () => {
      transactionClient.habit.updateMany.mockImplementation(
        track('habit.update', { count: 1 }),
      );
      const habit = createDomainHabit();
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today: TODAY,
      });

      expect(await repository.update(habit, 4)).toBe(true);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(calls).toEqual([
        'habit.update',
        'scheduleVersion.close',
        'scheduleVersion.create',
      ]);
      expect(
        transactionClient.habitScheduleVersion.updateMany,
      ).toHaveBeenCalledWith({
        where: { habitId: 'habit-id', ownerId: 'owner-id', effectiveTo: null },
        data: { effectiveTo: new Date('2026-10-09T00:00:00.000Z') },
      });
      expect(
        transactionClient.habitScheduleVersion.create,
      ).toHaveBeenCalledWith({
        data: {
          habitId: 'habit-id',
          ownerId: 'owner-id',
          frequencyType: PrismaHabitFrequencyType.DAILY,
          frequencyDays: [],
          effectiveFrom: new Date('2026-10-09T00:00:00.000Z'),
        },
      });
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('closes then opens once per change, in order, for same-day changes', async () => {
      transactionClient.habit.updateMany.mockResolvedValue({ count: 1 });
      const habit = createDomainHabit();
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today: TODAY,
      });
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.weekly([2]),
        today: TODAY,
      });

      expect(await repository.update(habit, 4)).toBe(true);

      expect(calls).toEqual([
        'scheduleVersion.close',
        'scheduleVersion.create',
        'scheduleVersion.close',
        'scheduleVersion.create',
      ]);
      expect(
        transactionClient.habitScheduleVersion.create.mock.calls.map(
          ([args]: [{ data: { frequencyType: string } }]) =>
            args.data.frequencyType,
        ),
      ).toEqual([
        PrismaHabitFrequencyType.DAILY,
        PrismaHabitFrequencyType.WEEKLY,
      ]);
    });

    it('writes no schedule version when the revision is stale', async () => {
      transactionClient.habit.updateMany.mockResolvedValue({ count: 0 });
      const habit = createDomainHabit();
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today: TODAY,
      });

      expect(await repository.update(habit, 3)).toBe(false);
      expect(
        transactionClient.habitScheduleVersion.updateMany,
      ).not.toHaveBeenCalled();
      expect(
        transactionClient.habitScheduleVersion.create,
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
      expect(
        transactionClient.habitScheduleVersion.create,
      ).not.toHaveBeenCalled();
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
    it('scopes the lookup by owner and loads the history floors', async () => {
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
          scheduleVersions: {
            select: { effectiveFrom: true },
            where: { effectiveTo: null },
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
    openScheduleEffectiveFrom: HabitCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
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
