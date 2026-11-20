import { outboxSerializerFor } from '@infrastructure/event-bus/outbox/testing/outbox-serializer.testing';
import { HabitOutbox } from '../outbox/habit.outbox';
import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
  HabitType as PrismaHabitType,
} from '@repo/database';

import { HabitState, HabitType } from '../../domain/enums';
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
      deleteMany: jest.fn(),
    },
    outboxEvent: {
      createMany: jest.fn(),
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

  const repository = new PrismaHabitRepository(
    prisma as never,
    outboxSerializerFor(HabitOutbox),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    calls.length = 0;
    transactionClient.habit.create.mockImplementation(
      track('habit.create', rawHabit()),
    );
    transactionClient.outboxEvent.createMany.mockImplementation(
      track('outbox.createMany', { count: 1 }),
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
      expect(calls).toEqual([
        'habit.create',
        'outbox.createMany',
        'scheduleVersion.createMany',
      ]);
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

    // Cùng transaction với Habit: không bao giờ có Habit mà nơi khác không
    // biết, hay event về một Habit chưa từng được lưu.
    it('writes HabitCreated to the outbox in the same transaction, after the Habit', async () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        title: 'Quit smoking',
        type: HabitType.QUIT,
        quitStartedAt: new Date('2026-08-01T00:00:00.000Z'),
        today: TODAY,
      });

      await repository.create(habit);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(['habit.create', 'outbox.createMany']);
      expect(transactionClient.outboxEvent.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            type: 'forge.habit.created.v1',
            aggregateId: habit.id,
            payload: {
              habitId: habit.id,
              ownerId: 'owner-id',
              habitType: 'QUIT',
              title: 'Quit smoking',
              startedOn: '2026-08-01',
            },
          }),
        ],
      });
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
          state: HabitState.ACTIVE,
          stateBeforeTrash: null,
          trashedAt: null,
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

    it('writes HabitQuitStartChanged to the outbox after the update succeeds', async () => {
      transactionClient.habit.updateMany.mockImplementation(
        track('habit.update', { count: 1 }),
      );
      const habit = quitHabit();
      habit.update({
        title: habit.title,
        quitStartedAt: new Date('2026-08-15T00:00:00.000Z'),
        today: TODAY,
      });

      await repository.update(habit, 4);

      expect(calls).toEqual(['habit.update', 'outbox.createMany']);
      expect(transactionClient.outboxEvent.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            type: 'forge.habit.quit-start-changed.v1',
            aggregateId: 'habit-id',
            payload: {
              habitId: 'habit-id',
              ownerId: 'owner-id',
              startedOn: '2026-08-15',
            },
          }),
        ],
      });
    });

    it('writes no outbox row when the start day did not change or the revision is stale', async () => {
      transactionClient.habit.updateMany.mockResolvedValue({ count: 1 });
      const unchanged = quitHabit();
      unchanged.update({
        title: 'Quit sugar',
        quitStartedAt: new Date('2026-08-01T00:00:00.000Z'),
        today: TODAY,
      });
      await repository.update(unchanged, 4);

      transactionClient.habit.updateMany.mockResolvedValue({ count: 0 });
      const stale = quitHabit();
      stale.update({
        title: stale.title,
        quitStartedAt: new Date('2026-08-15T00:00:00.000Z'),
        today: TODAY,
      });
      await expect(repository.update(stale, 4)).resolves.toBe(false);

      expect(transactionClient.outboxEvent.createMany).not.toHaveBeenCalled();
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
          data: expect.objectContaining({
            state: HabitState.ARCHIVED,
            revision: 5,
          }),
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

  describe('deletePermanently', () => {
    const deletedHabit = (): Habit => {
      const habit = createDomainHabit({
        state: HabitState.TRASHED,
        stateBeforeTrash: HabitState.ACTIVE,
        trashedAt: new Date('2026-10-09T00:00:00.000Z'),
      });
      habit.deletePermanently();
      return habit;
    };

    it('deletes the owned Habit in Trash and writes HabitPermanentlyDeleted to the outbox', async () => {
      transactionClient.habit.deleteMany.mockResolvedValue({ count: 1 });
      const habit = deletedHabit();

      expect(await repository.deletePermanently(habit, 3)).toBe(true);
      expect(transactionClient.habit.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'habit-id',
          ownerId: 'owner-id',
          revision: 3,
          state: 'TRASHED',
        },
      });
      expect(transactionClient.outboxEvent.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            type: 'forge.habit.permanently-deleted.v1',
            aggregateId: 'habit-id',
            payload: { habitId: 'habit-id', ownerId: 'owner-id' },
          }),
        ],
      });
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('writes no outbox row when the Habit changed or left Trash', async () => {
      transactionClient.habit.deleteMany.mockResolvedValue({ count: 0 });
      const habit = deletedHabit();

      expect(await repository.deletePermanently(habit, 3)).toBe(false);
      expect(transactionClient.outboxEvent.createMany).not.toHaveBeenCalled();
      expect(habit.getDomainEvents()).toHaveLength(1);
    });
  });
});

function createDomainHabit(
  overrides: Partial<Parameters<typeof Habit.rehydrate>[0]> = {},
): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk without headphones',
    type: HabitType.BUILD,
    frequency: HabitFrequency.weekly([1, 3, 5]),
    quitStartedAt: null,
    state: HabitState.ACTIVE,
    stateBeforeTrash: null,
    trashedAt: null,
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
    ...overrides,
  });
}

function quitHabit(): Habit {
  return createDomainHabit({
    title: 'Quit smoking',
    type: HabitType.QUIT,
    frequency: null,
    quitStartedAt: new Date('2026-08-01T00:00:00.000Z'),
    openScheduleEffectiveFrom: null,
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
    state: HabitState.ACTIVE,
    stateBeforeTrash: null,
    trashedAt: null,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: new Date('2026-08-20T00:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  };
}
