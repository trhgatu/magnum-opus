import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
} from '@repo/database';

import { PrismaHabitReader } from './prisma-habit.reader';

describe('PrismaHabitReader', () => {
  const habitModel = {
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const prisma = {
    habit: habitModel,
    $transaction: jest.fn(),
  };
  const reader = new PrismaHabitReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    habitModel.findMany.mockReturnValue('find-many-query');
    habitModel.count.mockReturnValue('count-query');
    prisma.$transaction.mockResolvedValue([[rawHabit()], 1]);
  });

  it('applies ownership, status, search, sorting and pagination', async () => {
    const result = await reader.findAllForOwner('owner-id', {
      skip: 20,
      take: 10,
      isActive: false,
      search: '  walk  ',
      sortBy: 'title',
      sortOrder: 'asc',
    });

    const where = {
      ownerId: 'owner-id',
      isActive: false,
      OR: [
        { title: { contains: 'walk', mode: 'insensitive' } },
        { description: { contains: 'walk', mode: 'insensitive' } },
      ],
    };

    expect(habitModel.findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      skip: 20,
      take: 10,
    });
    expect(habitModel.count).toHaveBeenCalledWith({ where });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'find-many-query',
      'count-query',
    ]);
    expect(result.total).toBe(1);
    expect(result.habits[0]?.id).toBe('habit-id');
  });

  it('uses deterministic defaults and ignores blank search text', async () => {
    await reader.findAllForOwner('owner-id', {
      skip: 0,
      take: 10,
      search: '   ',
    });

    expect(habitModel.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-id' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: 0,
      take: 10,
    });
  });
});

function rawHabit(): PrismaHabit {
  return {
    id: 'habit-id',
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    frequencyType: PrismaHabitFrequencyType.DAILY,
    frequencyDays: [],
    isActive: true,
    revision: 1,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  };
}
