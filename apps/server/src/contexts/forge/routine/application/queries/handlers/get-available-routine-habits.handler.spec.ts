import { RoutineNotFoundException } from '../../../domain/exceptions';
import { GetAvailableRoutineHabitsQuery } from '../get-available-routine-habits.query';
import { GetAvailableRoutineHabitsHandler } from './get-available-routine-habits.handler';

describe('GetAvailableRoutineHabitsHandler', () => {
  const reader = {
    findAvailableHabitsForOwner: jest.fn(),
  };

  const handler = new GetAvailableRoutineHabitsHandler(reader as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns one page of available Habit options', async () => {
    const availableHabits = {
      habits: [
        {
          id: 'habit-id',
          title: 'Drink water',
        },
      ],
      total: 21,
    };

    reader.findAvailableHabitsForOwner.mockResolvedValue(availableHabits);

    const result = await handler.execute(
      new GetAvailableRoutineHabitsQuery(
        'routine-id',
        'owner-id',
        3,
        10,
        'water',
      ),
    );

    expect(reader.findAvailableHabitsForOwner).toHaveBeenCalledWith(
      'routine-id',
      'owner-id',
      {
        skip: 20,
        take: 10,
        search: 'water',
      },
    );

    expect(result.getValue()).toBe(availableHabits);
  });

  it('returns not found when the Routine is not owned by the requester', async () => {
    reader.findAvailableHabitsForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetAvailableRoutineHabitsQuery(
        'routine-id',
        'different-owner',
        1,
        20,
      ),
    );

    expect(result.getError()).toBeInstanceOf(RoutineNotFoundException);
  });
});
