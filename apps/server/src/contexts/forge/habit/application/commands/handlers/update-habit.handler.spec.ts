import {
  HabitNotFoundException,
  HabitRevisionConflictException,
} from '../../../domain/exceptions';
import { HabitFrequencyType } from '../../../domain/enums';
import { Habit } from '../../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../../domain/value-objects';
import { HabitMutationService } from '../../services';
import { UpdateHabitCommand } from '../update-habit.command';
import { UpdateHabitHandler } from './update-habit.handler';

describe('UpdateHabitHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const mutationService = new HabitMutationService(repository as never);
  const handler = new UpdateHabitHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('updates the Habit using the expected revision', async () => {
    const habit = createHabit();
    repository.findByIdForOwner.mockResolvedValue(habit);

    const result = await handler.execute(
      updateCommand({
        title: 'Evening walk',
        description: 'After work',
        frequencyType: HabitFrequencyType.WEEKLY,
        frequencyDays: [5, 1],
      }),
    );

    expect(result.getValue().title).toBe('Evening walk');
    expect(result.getValue().frequency.days).toEqual([1, 5]);
    expect(result.getValue().revision).toBe(2);
    expect(repository.update).toHaveBeenCalledWith(habit, 1);
  });

  it('returns not found without writing', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(updateCommand());

    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before mutation', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(3));

    const result = await handler.execute(
      updateCommand({ expectedRevision: 2 }),
    );

    expect(result.getError()).toBeInstanceOf(HabitRevisionConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

function updateCommand(
  overrides: Partial<{
    expectedRevision: number;
    title: string;
    description: string | null;
    frequencyType: HabitFrequencyType;
    frequencyDays: number[];
  }> = {},
): UpdateHabitCommand {
  return new UpdateHabitCommand({
    habitId: 'habit-id',
    ownerId: 'owner-id',
    expectedRevision: overrides.expectedRevision ?? 1,
    title: overrides.title ?? 'Morning walk',
    description: overrides.description,
    frequencyType: overrides.frequencyType ?? HabitFrequencyType.DAILY,
    frequencyDays: overrides.frequencyDays,
  });
}

function createHabit(revision = 1): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    frequency: HabitFrequency.daily(),
    isActive: true,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
