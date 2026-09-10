import { HabitFrequencyType, HabitType } from '../../../domain/enums';
import { CreateHabitCommand } from '../create-habit.command';
import { CreateHabitHandler } from './create-habit.handler';

describe('CreateHabitHandler', () => {
  const repository = {
    create: jest.fn(),
  };

  const handler = new CreateHabitHandler(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockResolvedValue(undefined);
  });

  it('creates and persists a private weekly Habit', async () => {
    const result = await handler.execute(
      new CreateHabitCommand({
        ownerId: 'owner-id',
        title: '  Morning walk  ',
        description: '  Outside  ',
        type: HabitType.BUILD,
        frequencyType: HabitFrequencyType.WEEKLY,
        frequencyDays: [5, 1, 5],
      }),
    );

    const habit = result.getValue();
    expect(habit.ownerId).toBe('owner-id');
    expect(habit.title).toBe('Morning walk');
    expect(habit.description).toBe('Outside');
    expect(habit.frequency?.days).toEqual([1, 5]);
    expect(habit.revision).toBe(1);
    expect(repository.create).toHaveBeenCalledWith(habit);
  });

  it('creates a daily Habit with no weekdays', async () => {
    const result = await handler.execute(
      new CreateHabitCommand({
        ownerId: 'owner-id',
        title: 'Drink water',
        type: HabitType.BUILD,
        frequencyType: HabitFrequencyType.DAILY,
      }),
    );

    expect(result.getValue().frequency?.days).toEqual([]);
  });

  it('creates a QUIT Habit defaulting quitStartedAt to today', async () => {
    const result = await handler.execute(
      new CreateHabitCommand({
        ownerId: 'owner-id',
        title: 'Quit smoking',
        type: HabitType.QUIT,
      }),
    );

    const habit = result.getValue();
    expect(habit.frequency).toBeNull();
    expect(habit.quitStartedAt).not.toBeNull();
  });
});
