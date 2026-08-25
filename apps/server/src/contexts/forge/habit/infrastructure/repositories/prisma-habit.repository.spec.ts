import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
} from '@repo/database';

import { Habit } from '../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../domain/value-objects';
import { PrismaHabitRepository } from './prisma-habit.repository';

describe('PrismaHabitRepository', () => {
  const habitModel = {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  };

  const repository = new PrismaHabitRepository({ habit: habitModel } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('persists the complete aggregate state', async () => {
      habitModel.create.mockResolvedValue(rawHabit());

      await repository.create(createDomainHabit());

      expect(habitModel.create).toHaveBeenCalledWith({
        data: rawHabit(),
      });
    });
  });

  describe('update', () => {
    it('updates only the owned Habit at the expected revision', async () => {
      habitModel.updateMany.mockResolvedValue({ count: 1 });
      const habit = createDomainHabit();
      habit.update({
        title: 'Evening walk',
        description: null,
        frequency: HabitFrequency.daily(),
      });

      const updated = await repository.update(habit, 4);

      expect(updated).toBe(true);
      expect(habitModel.updateMany).toHaveBeenCalledWith({
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
          isActive: true,
          revision: 5,
          updatedAt: habit.updatedAt,
        },
      });
    });

    it('returns false when ownership or expected revision does not match', async () => {
      habitModel.updateMany.mockResolvedValue({ count: 0 });

      expect(await repository.update(createDomainHabit(), 3)).toBe(false);
    });
  });

  describe('findByIdForOwner', () => {
    it('scopes the lookup by both Habit ID and owner ID', async () => {
      habitModel.findFirst.mockResolvedValue(rawHabit());

      const habit = await repository.findByIdForOwner('habit-id', 'owner-id');

      expect(habitModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'habit-id',
          ownerId: 'owner-id',
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
    frequency: HabitFrequency.weekly([1, 3, 5]),
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  });
}

function rawHabit(): PrismaHabit {
  return {
    id: 'habit-id',
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk without headphones',
    frequencyType: PrismaHabitFrequencyType.WEEKLY,
    frequencyDays: [1, 3, 5],
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  };
}
