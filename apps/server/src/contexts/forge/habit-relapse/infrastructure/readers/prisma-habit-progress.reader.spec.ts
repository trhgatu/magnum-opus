import { PrismaHabitProgressReader } from './prisma-habit-progress.reader';

describe('PrismaHabitProgressReader', () => {
  const habitModel = { findFirst: jest.fn() };
  const habitRelapseModel = { findFirst: jest.fn() };
  const prisma = { habit: habitModel, habitRelapse: habitRelapseModel };
  const reader = new PrismaHabitProgressReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the most recent relapse on or after quitStartedAt', async () => {
    const quitStartedAt = new Date('2026-08-01T00:00:00.000Z');
    const occurredAt = new Date('2026-08-20T10:00:00.000Z');
    habitModel.findFirst.mockResolvedValue({ quitStartedAt });
    habitRelapseModel.findFirst.mockResolvedValue({ occurredAt });

    const result = await reader.getProgressFor('habit-id', 'owner-id');

    expect(habitRelapseModel.findFirst).toHaveBeenCalledWith({
      where: {
        habitId: 'habit-id',
        ownerId: 'owner-id',
        occurredAt: { gte: quitStartedAt },
      },
      orderBy: { occurredAt: 'desc' },
    });
    expect(result).toEqual({ sinceDate: occurredAt, sinceReason: 'RELAPSE' });
  });

  it('falls back to quitStartedAt when no relapse qualifies', async () => {
    const quitStartedAt = new Date('2026-08-01T00:00:00.000Z');
    habitModel.findFirst.mockResolvedValue({ quitStartedAt });
    habitRelapseModel.findFirst.mockResolvedValue(null);

    const result = await reader.getProgressFor('habit-id', 'owner-id');

    expect(result).toEqual({
      sinceDate: quitStartedAt,
      sinceReason: 'QUIT_STARTED_AT',
    });
  });

  it('throws when the Habit invariant is violated (no quitStartedAt)', async () => {
    habitModel.findFirst.mockResolvedValue({ quitStartedAt: null });

    await expect(reader.getProgressFor('habit-id', 'owner-id')).rejects.toThrow(
      /Invariant violated/,
    );
  });
});
