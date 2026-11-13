import { PrismaOwnedHabitReader } from './prisma-owned-habit.reader';

describe('PrismaOwnedHabitReader', () => {
  const habitModel = { findFirst: jest.fn() };
  const prisma = { habit: habitModel };
  const reader = new PrismaOwnedHabitReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes the lookup to the id and owner, selecting id/state/type', async () => {
    habitModel.findFirst.mockResolvedValue({
      id: 'habit-id',
      state: 'ACTIVE',
      type: 'QUIT',
    });

    const result = await reader.findByIdForOwner('habit-id', 'owner-id');

    expect(habitModel.findFirst).toHaveBeenCalledWith({
      where: { id: 'habit-id', ownerId: 'owner-id' },
      select: { id: true, state: true, type: true },
    });
    expect(result).toEqual({ id: 'habit-id', isActive: true, type: 'QUIT' });
  });

  it.each([
    ['ARCHIVED', false],
    ['TRASHED', false],
  ])('reports a %s Habit as not active', async (state, isActive) => {
    habitModel.findFirst.mockResolvedValue({
      id: 'habit-id',
      state,
      type: 'BUILD',
    });

    const result = await reader.findByIdForOwner('habit-id', 'owner-id');

    expect(result?.isActive).toBe(isActive);
  });

  it('returns null when no Habit matches the owner', async () => {
    habitModel.findFirst.mockResolvedValue(null);

    await expect(
      reader.findByIdForOwner('habit-id', 'owner-id'),
    ).resolves.toBeNull();
  });
});
