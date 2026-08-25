import { HabitNotFoundException } from '../../../domain/exceptions';
import { Habit } from '../../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../../domain/value-objects';
import { GetHabitQuery } from '../get-habit.query';
import { GetHabitHandler } from './get-habit.handler';

describe('GetHabitHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
  };

  const handler = new GetHabitHandler(repository as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns a Habit owned by the requesting user', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit());

    const result = await handler.execute(
      new GetHabitQuery('habit-id', 'owner-id'),
    );

    expect(result.getValue().id).toBe('habit-id');
    expect(repository.findByIdForOwner).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
    );
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetHabitQuery('habit-id', 'different-owner'),
    );

    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
  });
});

function createHabit(): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    frequency: HabitFrequency.daily(),
    isActive: true,
    revision: 1,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
