import { Habit } from '../../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../../domain/value-objects';
import { HabitMutationService } from '../../services';
import { ArchiveHabitCommand } from '../archive-habit.command';
import { RestoreHabitCommand } from '../restore-habit.command';
import { ArchiveHabitHandler } from './archive-habit.handler';
import { RestoreHabitHandler } from './restore-habit.handler';

describe('Habit lifecycle command handlers', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const mutationService = new HabitMutationService(repository as never);
  const archiveHandler = new ArchiveHabitHandler(mutationService);
  const restoreHandler = new RestoreHabitHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('archives an active Habit', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(true, 1));

    const result = await archiveHandler.execute(
      new ArchiveHabitCommand('habit-id', 'owner-id', 1),
    );

    expect(result.getValue().isActive).toBe(false);
    expect(result.getValue().revision).toBe(2);
  });

  it('restores an archived Habit', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(false, 4));

    const result = await restoreHandler.execute(
      new RestoreHabitCommand('habit-id', 'owner-id', 4),
    );

    expect(result.getValue().isActive).toBe(true);
    expect(result.getValue().revision).toBe(5);
  });
});

function createHabit(isActive: boolean, revision: number): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    frequency: HabitFrequency.daily(),
    isActive,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
