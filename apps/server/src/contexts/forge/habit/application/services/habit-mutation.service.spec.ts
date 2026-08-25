import {
  HabitNotFoundException,
  HabitRevisionConflictException,
  InvalidHabitTransitionException,
} from '../../domain/exceptions';
import { Habit } from '../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../domain/value-objects';
import { HabitMutationService } from './habit-mutation.service';

describe('HabitMutationService', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const service = new HabitMutationService(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('loads by owner, mutates and persists at the expected revision', async () => {
    const habit = createHabit();
    repository.findByIdForOwner.mockResolvedValue(habit);

    const result = await service.mutate({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      expectedRevision: 1,
      mutate: (current) => current.archive(),
    });

    expect(result.getValue().isActive).toBe(false);
    expect(repository.findByIdForOwner).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
    );
    expect(repository.update).toHaveBeenCalledWith(habit, 1);
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await service.mutate({
      habitId: 'habit-id',
      ownerId: 'different-owner',
      expectedRevision: 1,
      mutate: (habit) => habit.archive(),
    });

    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before mutating', async () => {
    const habit = createHabit(3);
    repository.findByIdForOwner.mockResolvedValue(habit);

    const result = await service.mutate({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      expectedRevision: 2,
      mutate: (current) => current.archive(),
    });

    expect(result.getError()).toBeInstanceOf(HabitRevisionConflictException);
    expect(habit.isActive).toBe(true);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns a domain transition error without writing', async () => {
    const habit = createHabit();
    habit.archive();
    repository.findByIdForOwner.mockResolvedValue(habit);

    const result = await service.mutate({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      expectedRevision: 2,
      mutate: (current) => current.archive(),
    });

    expect(result.getError()).toBeInstanceOf(InvalidHabitTransitionException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not write when the aggregate did not change', async () => {
    const habit = createHabit();
    repository.findByIdForOwner.mockResolvedValue(habit);

    const result = await service.mutate({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      expectedRevision: 1,
      mutate: (current) =>
        current.update({
          title: 'Morning walk',
          description: null,
          frequency: HabitFrequency.daily(),
        }),
    });

    expect(result.isSuccess).toBe(true);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('detects a race after the aggregate was loaded', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit());
    repository.update.mockResolvedValue(false);

    const result = await service.mutate({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      expectedRevision: 1,
      mutate: (habit) => habit.archive(),
    });

    expect(result.getError()).toBeInstanceOf(HabitRevisionConflictException);
  });
});

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
