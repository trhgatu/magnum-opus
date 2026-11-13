import { HabitState, HabitType } from '../../../domain/enums';
import {
  HabitNotFoundException,
  HabitPermanentDeleteForbiddenException,
  HabitRevisionConflictException,
} from '../../../domain/exceptions';
import { Habit } from '../../../domain/habit.aggregate';
import {
  HabitCalendarDate,
  HabitFrequency,
  HabitId,
} from '../../../domain/value-objects';
import { DeleteHabitCommand } from '../delete-habit.command';
import { DeleteHabitHandler } from './delete-habit.handler';

describe('DeleteHabitHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    deletePermanently: jest.fn(),
  };
  const handler = new DeleteHabitHandler(repository as never);
  const command = new DeleteHabitCommand('habit-id', 'owner-id', 3);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.deletePermanently.mockResolvedValue(true);
  });

  it('permanently deletes a Habit in Trash', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createHabit(HabitState.TRASHED, 3),
    );

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(repository.findByIdForOwner).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
    );
    expect(repository.deletePermanently).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
      3,
    );
  });

  it.each([HabitState.ACTIVE, HabitState.ARCHIVED])(
    'refuses to delete a %s Habit',
    async (state) => {
      repository.findByIdForOwner.mockResolvedValue(createHabit(state, 3));

      const result = await handler.execute(command);

      expect(result.getError()).toBeInstanceOf(
        HabitPermanentDeleteForbiddenException,
      );
      expect(repository.deletePermanently).not.toHaveBeenCalled();
    },
  );

  it('reports a missing Habit as not found', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(command);

    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('reports a stale revision as a conflict', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createHabit(HabitState.TRASHED, 4),
    );

    const result = await handler.execute(command);

    expect(result.getError()).toBeInstanceOf(HabitRevisionConflictException);
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('reports a conflict when the Habit changed before the delete ran', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createHabit(HabitState.TRASHED, 3),
    );
    repository.deletePermanently.mockResolvedValue(false);

    const result = await handler.execute(command);

    expect(result.getError()).toBeInstanceOf(HabitRevisionConflictException);
  });
});

function createHabit(state: HabitState, revision: number): Habit {
  const trashed = state === HabitState.TRASHED;
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    type: HabitType.BUILD,
    frequency: HabitFrequency.daily(),
    quitStartedAt: null,
    state,
    stateBeforeTrash: trashed ? HabitState.ACTIVE : null,
    trashedAt: trashed ? new Date('2026-10-09T00:00:00.000Z') : null,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: HabitCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
    latestLifecycleEffectiveOn: undefined,
    openScheduleEffectiveFrom: undefined,
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
