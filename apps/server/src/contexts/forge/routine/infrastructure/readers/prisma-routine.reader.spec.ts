import {
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import { PrismaRoutineReader } from './prisma-routine.reader';

describe('PrismaRoutineReader', () => {
  const routineModel = {
    findMany: jest.fn(),
    count: jest.fn(),
  };

  const prisma = {
    routine: routineModel,
    $transaction: jest.fn(),
  };

  const reader = new PrismaRoutineReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();

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
