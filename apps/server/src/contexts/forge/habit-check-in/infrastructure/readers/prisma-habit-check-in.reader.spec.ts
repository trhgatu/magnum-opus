import { PrismaHabitCheckInReader } from './prisma-habit-check-in.reader';

describe('PrismaHabitCheckInReader', () => {
  const habitCheckInModel = { findFirst: jest.fn(), findMany: jest.fn() };
  const prisma = { habitCheckIn: habitCheckInModel };
  const reader = new PrismaHabitCheckInReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findForHabitOnDate', () => {
    it('queries the persistence date for the habit and owner', async () => {
      habitCheckInModel.findFirst.mockResolvedValue({
        id: 'check-in-id',
        habitId: 'habit-id',
        date: new Date('2026-08-24T00:00:00.000Z'),
        createdAt: new Date('2026-08-24T09:15:00.000Z'),
      });

      const result = await reader.findForHabitOnDate(
        'habit-id',
        'owner-id',
        '2026-08-24',
      );

      expect(habitCheckInModel.findFirst).toHaveBeenCalledWith({
        where: {
          habitId: 'habit-id',
          ownerId: 'owner-id',
          date: new Date('2026-08-24T00:00:00.000Z'),
        },
      });
      expect(result).toEqual({
        id: 'check-in-id',
        habitId: 'habit-id',
        date: '2026-08-24',
        createdAt: new Date('2026-08-24T09:15:00.000Z'),
      });
    });

    it('returns null when no check-in exists for that date', async () => {
      habitCheckInModel.findFirst.mockResolvedValue(null);

      await expect(
        reader.findForHabitOnDate('habit-id', 'owner-id', '2026-08-24'),
      ).resolves.toBeNull();
    });
  });

  describe('findForHabitInRange', () => {
    it('queries an inclusive date range ordered by date then id', async () => {
      habitCheckInModel.findMany.mockResolvedValue([
        {
          id: 'check-in-id',
          habitId: 'habit-id',
          date: new Date('2026-08-24T00:00:00.000Z'),
          createdAt: new Date('2026-08-24T09:15:00.000Z'),
        },
      ]);

      const result = await reader.findForHabitInRange(
        'habit-id',
        'owner-id',
        '2026-08-01',
        '2026-08-31',
      );

      expect(habitCheckInModel.findMany).toHaveBeenCalledWith({
        where: {
          habitId: 'habit-id',
          ownerId: 'owner-id',
          date: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lte: new Date('2026-08-31T00:00:00.000Z'),
          },
        },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      });
      expect(result).toEqual([
        {
          id: 'check-in-id',
          habitId: 'habit-id',
          date: '2026-08-24',
          createdAt: new Date('2026-08-24T09:15:00.000Z'),
        },
      ]);
    });
  });
});
