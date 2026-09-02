import { PrismaOwnedHabitReader } from './prisma-owned-habit.reader';

describe('PrismaOwnedHabitReader', () => {
  const habitModel = { findFirst: jest.fn() };
  const prisma = { habit: habitModel };
  const reader = new PrismaOwnedHabitReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes the lookup to the id and owner, selecting only the check-in-relevant fields', async () => {
    habitModel.findFirst.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
    });

    const result = await reader.findByIdForOwner('habit-id', 'owner-id');

    expect(habitModel.findFirst).toHaveBeenCalledWith({
      where: { id: 'habit-id', ownerId: 'owner-id' },
      select: { id: true, isActive: true },
    });
    expect(result).toEqual({ id: 'habit-id', isActive: true });
  });

  it('returns null when no Habit matches the owner', async () => {
    habitModel.findFirst.mockResolvedValue(null);

    await expect(
      reader.findByIdForOwner('habit-id', 'owner-id'),
    ).resolves.toBeNull();
  });
});
