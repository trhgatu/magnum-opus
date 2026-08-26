import { PrismaRoutineHabitReader } from './prisma-routine-habit.reader';

describe('PrismaRoutineHabitReader', () => {
  const habitModel = {
    findFirst: jest.fn(),
  };

  const reader = new PrismaRoutineHabitReader({
    habit: habitModel,
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads only the Habit status for the Routine owner', async () => {
    habitModel.findFirst.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
    });

    const habit = await reader.findByIdForOwner('habit-id', 'owner-id');

    expect(habitModel.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'habit-id',
        ownerId: 'owner-id',
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    expect(habit).toEqual({
      id: 'habit-id',
      isActive: true,
    });
  });

  it('returns null when no Habit belongs to the owner', async () => {
    habitModel.findFirst.mockResolvedValue(null);

    expect(
      await reader.findByIdForOwner('habit-id', 'different-owner'),
    ).toBeNull();
  });
});
