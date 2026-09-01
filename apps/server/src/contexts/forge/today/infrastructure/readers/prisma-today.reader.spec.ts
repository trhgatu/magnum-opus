import { PrismaTodayReader } from './prisma-today.reader';

describe('PrismaTodayReader', () => {
  const userModel = {
    findUniqueOrThrow: jest.fn(),
  };

  const habitModel = {
    findMany: jest.fn(),
  };

  const habitCheckInModel = {
    findMany: jest.fn(),
  };

  const prisma = {
    user: userModel,
    habit: habitModel,
    habitCheckIn: habitCheckInModel,
  };

  const reader = new PrismaTodayReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();

    userModel.findUniqueOrThrow.mockResolvedValue({
      timeZone: 'Asia/Bangkok',
      _count: {
        habits: 3,
      },
    });

    habitModel.findMany.mockResolvedValue([]);
    habitCheckInModel.findMany.mockResolvedValue([]);
  });

  it('returns no active Habits without loading the schedule', async () => {
    userModel.findUniqueOrThrow.mockResolvedValue({
      timeZone: 'Asia/Bangkok',
      _count: {
        habits: 0,
      },
    });

    const result = await reader.findForOwnerAt(
      'owner-id',
      new Date('2026-08-30T17:30:00.000Z'),
    );

    expect(result).toEqual({
      date: '2026-08-31',
      timeZone: 'Asia/Bangkok',
      emptyReason: 'NO_ACTIVE_HABITS',
      routines: [],
      standaloneHabits: [],
    });

    expect(habitModel.findMany).not.toHaveBeenCalled();
    expect(habitCheckInModel.findMany).not.toHaveBeenCalled();
  });

  it('returns nothing due without loading check-ins', async () => {
    habitModel.findMany.mockResolvedValue([]);

    const result = await reader.findForOwnerAt(
      'owner-id',
      new Date('2026-08-30T17:30:00.000Z'),
    );

    expect(result.emptyReason).toBe('NOTHING_DUE');
    expect(result.routines).toEqual([]);
    expect(result.standaloneHabits).toEqual([]);

    expect(habitCheckInModel.findMany).not.toHaveBeenCalled();
  });

  it('groups due Habits by active Routine and synchronizes check-ins', async () => {
    habitModel.findMany.mockResolvedValue([
      {
        id: 'habit-standalone',
        title: 'Journal',
        description: null,
        routineLinks: [],
      },
      {
        id: 'habit-shared',
        title: 'Drink water',
        description: 'One glass',
        routineLinks: [
          {
            order: 2,
            routine: {
              id: 'routine-morning',
              title: 'Morning',
            },
          },
          {
            order: 1,
            routine: {
              id: 'routine-health',
              title: 'Health',
            },
          },
        ],
      },
      {
        id: 'habit-first',
        title: 'Stretch',
        description: null,
        routineLinks: [
          {
            order: 1,
            routine: {
              id: 'routine-morning',
              title: 'Morning',
            },
          },
        ],
      },
    ]);

    habitCheckInModel.findMany.mockResolvedValue([
      {
        habitId: 'habit-shared',
      },
    ]);

    const result = await reader.findForOwnerAt(
      'owner-id',
      new Date('2026-08-30T17:30:00.000Z'),
    );

    expect(habitModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ownerId: 'owner-id',
          isActive: true,
          OR: [
            {
              frequencyType: 'DAILY',
            },
            {
              frequencyType: 'WEEKLY',
              frequencyDays: {
                has: 1,
              },
            },
          ],
        },
      }),
    );

    expect(habitCheckInModel.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'owner-id',
        date: new Date('2026-08-31T00:00:00.000Z'),
        habitId: {
          in: ['habit-standalone', 'habit-shared', 'habit-first'],
        },
      },
      select: {
        habitId: true,
      },
    });

    expect(result).toEqual({
      date: '2026-08-31',
      timeZone: 'Asia/Bangkok',
      emptyReason: null,
      routines: [
        {
          id: 'routine-health',
          title: 'Health',
          habits: [
            {
              id: 'habit-shared',
              title: 'Drink water',
              description: 'One glass',
              checkedIn: true,
            },
          ],
        },
        {
          id: 'routine-morning',
          title: 'Morning',
          habits: [
            {
              id: 'habit-first',
              title: 'Stretch',
              description: null,
              checkedIn: false,
            },
            {
              id: 'habit-shared',
              title: 'Drink water',
              description: 'One glass',
              checkedIn: true,
            },
          ],
        },
      ],
      standaloneHabits: [
        {
          id: 'habit-standalone',
          title: 'Journal',
          description: null,
          checkedIn: false,
        },
      ],
    });
  });
});
