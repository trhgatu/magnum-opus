import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { PrismaHabitRelapseRepository } from './prisma-habit-relapse.repository';

describe('PrismaHabitRelapseRepository', () => {
  const habitRelapseModel = { create: jest.fn() };
  const repository = new PrismaHabitRelapseRepository({
    habitRelapse: habitRelapseModel,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('persists a new relapse record', async () => {
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T10:00:00.000Z'),
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    });
    habitRelapseModel.create.mockResolvedValue(undefined);

    await repository.create(relapse);

    expect(habitRelapseModel.create).toHaveBeenCalledWith({
      data: relapse.toPrimitives(),
    });
  });
});
