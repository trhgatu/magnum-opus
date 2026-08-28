import {
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import { PrismaRoutineReader } from './prisma-routine.reader';

describe('PrismaRoutineReader', () => {
  const routineModel = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const habitModel = {
    findMany: jest.fn(),
    count: jest.fn(),
  };

  const prisma = {
    routine: routineModel,
    habit: habitModel,
    $transaction: jest.fn(),
  };

  const reader = new PrismaRoutineReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();

    routineModel.findFirst.mockResolvedValue({
      ...rawRoutine(),
      habits: [
        {
          order: 1,
          habit: {
            id: 'habit-first',
            title: 'Drink water',
            isActive: true,
          },
        },
        {
          order: 2,
          habit: {
            id: 'habit-second',
            title: 'Read',
            isActive: false,
          },
        },
      ],
    });

    routineModel.findMany.mockReturnValue('find-many-query');

    routineModel.count.mockReturnValue('count-query');

    prisma.$transaction.mockResolvedValue([
      [
        {
          ...rawRoutine(),
          habits: rawMemberships(),
        },
      ],
      1,
    ]);
  });

  it('loads one owned Routine with ordered Habit summaries', async () => {
    const result = await reader.findByIdForOwner('routine-id', 'owner-id');

    expect(routineModel.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'routine-id',
        ownerId: 'owner-id',
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
        habits: {
          orderBy: {
            order: 'asc',
          },
          select: {
            order: true,
            habit: {
              select: {
                id: true,
                title: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    expect(result).toEqual({
      id: 'routine-id',
      title: 'Morning ritual',
      isActive: true,
      revision: 4,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
      habits: [
        {
          id: 'habit-first',
          title: 'Drink water',
          isActive: true,
          order: 1,
        },
        {
          id: 'habit-second',
          title: 'Read',
          isActive: false,
          order: 2,
        },
      ],
    });
  });

  it('returns null when no owned Routine exists', async () => {
    routineModel.findFirst.mockResolvedValue(null);

    await expect(
      reader.findByIdForOwner('routine-id', 'different-owner'),
    ).resolves.toBeNull();
  });

  it('applies ownership, status, search, sorting and pagination', async () => {
    const result = await reader.findAllForOwner('owner-id', {
      skip: 20,
      take: 10,
      isActive: false,
      search: '  ritual  ',
      sortBy: 'title',
      sortOrder: 'asc',
    });

    const where = {
      ownerId: 'owner-id',
      isActive: false,
      title: {
        contains: 'ritual',
        mode: 'insensitive',
      },
    };

    expect(routineModel.findMany).toHaveBeenCalledWith({
      where,
      include: {
        habits: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: [
        {
          title: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      skip: 20,
      take: 10,
    });

    expect(routineModel.count).toHaveBeenCalledWith({
      where,
    });

    expect(prisma.$transaction).toHaveBeenCalledWith([
      'find-many-query',
      'count-query',
    ]);

    expect(result.total).toBe(1);

    expect(result.routines[0]?.habitIds).toEqual([
      'habit-first',
      'habit-second',
    ]);
  });

  it('uses deterministic defaults and ignores blank search text', async () => {
    await reader.findAllForOwner('owner-id', {
      skip: 0,
      take: 10,
      search: '   ',
    });

    expect(routineModel.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'owner-id',
      },
      include: {
        habits: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          id: 'asc',
        },
      ],
      skip: 0,
      take: 10,
    });
  });
  describe('findAvailableHabitsForOwner', () => {
    it('returns active owned Habits that are not already in the Routine', async () => {
      routineModel.findFirst.mockReturnValue('owned-routine-query');
      habitModel.findMany.mockReturnValue('available-habits-query');
      habitModel.count.mockReturnValue('available-habits-count-query');

      prisma.$transaction.mockResolvedValue([
        {
          id: 'routine-id',
        },
        [
          {
            id: 'habit-first',
            title: 'Drink water',
          },
          {
            id: 'habit-second',
            title: 'Read',
          },
        ],
        2,
      ]);

      const result = await reader.findAvailableHabitsForOwner(
        'routine-id',
        'owner-id',
        {
          skip: 20,
          take: 10,
          search: '  morning  ',
        },
      );

      const where = {
        ownerId: 'owner-id',
        isActive: true,
        routineLinks: {
          none: {
            routineId: 'routine-id',
            ownerId: 'owner-id',
          },
        },
        title: {
          contains: 'morning',
          mode: 'insensitive',
        },
      };

      expect(routineModel.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'routine-id',
          ownerId: 'owner-id',
        },
        select: {
          id: true,
        },
      });

      expect(habitModel.findMany).toHaveBeenCalledWith({
        where,
        select: {
          id: true,
          title: true,
        },
        orderBy: [
          {
            title: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 20,
        take: 10,
      });

      expect(habitModel.count).toHaveBeenCalledWith({
        where,
      });

      expect(prisma.$transaction).toHaveBeenCalledWith([
        'owned-routine-query',
        'available-habits-query',
        'available-habits-count-query',
      ]);

      expect(result).toEqual({
        habits: [
          {
            id: 'habit-first',
            title: 'Drink water',
          },
          {
            id: 'habit-second',
            title: 'Read',
          },
        ],
        total: 2,
      });
    });

    it('ignores blank search text', async () => {
      routineModel.findFirst.mockReturnValue('owned-routine-query');
      habitModel.findMany.mockReturnValue('available-habits-query');
      habitModel.count.mockReturnValue('available-habits-count-query');

      prisma.$transaction.mockResolvedValue([
        {
          id: 'routine-id',
        },
        [],
        0,
      ]);

      await reader.findAvailableHabitsForOwner('routine-id', 'owner-id', {
        skip: 0,
        take: 20,
        search: '   ',
      });

      expect(habitModel.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'owner-id',
          isActive: true,
          routineLinks: {
            none: {
              routineId: 'routine-id',
              ownerId: 'owner-id',
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
        orderBy: [
          {
            title: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 20,
      });
    });

    it('returns null when the Routine does not belong to the owner', async () => {
      routineModel.findFirst.mockReturnValue('owned-routine-query');
      habitModel.findMany.mockReturnValue('available-habits-query');
      habitModel.count.mockReturnValue('available-habits-count-query');

      prisma.$transaction.mockResolvedValue([
        null,
        [
          {
            id: 'hidden-habit',
            title: 'Must not escape',
          },
        ],
        1,
      ]);

      const result = await reader.findAvailableHabitsForOwner(
        'routine-id',
        'different-owner',
        {
          skip: 0,
          take: 20,
        },
      );

      expect(result).toBeNull();
    });
  });
});

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
}
