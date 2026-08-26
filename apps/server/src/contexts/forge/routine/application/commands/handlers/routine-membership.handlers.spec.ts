import { RoutineHabitNotFoundException } from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import { RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService } from '../../services';
import { MoveRoutineHabitDownCommand } from '../move-routine-habit-down.command';
import { MoveRoutineHabitUpCommand } from '../move-routine-habit-up.command';
import { RemoveRoutineHabitCommand } from '../remove-routine-habit.command';
import { MoveRoutineHabitDownHandler } from './move-routine-habit-down.handler';
import { MoveRoutineHabitUpHandler } from './move-routine-habit-up.handler';
import { RemoveRoutineHabitHandler } from './remove-routine-habit.handler';

describe('Routine membership command handlers', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const mutationService = new RoutineMutationService(repository as never);

  const removeHandler = new RemoveRoutineHabitHandler(mutationService);

  const moveUpHandler = new MoveRoutineHabitUpHandler(mutationService);

  const moveDownHandler = new MoveRoutineHabitDownHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('removes a Habit and closes the order gap', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await removeHandler.execute(
      new RemoveRoutineHabitCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-second',
        expectedRevision: 4,
      }),
    );

    expect(result.getValue().habitIds).toEqual(['habit-first', 'habit-third']);

    expect(result.getValue().revision).toBe(5);

    expect(repository.update).toHaveBeenCalledWith(routine, 4);
  });

  it('moves a Habit one position up', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await moveUpHandler.execute(
      new MoveRoutineHabitUpCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-second',
        expectedRevision: 4,
      }),
    );

    expect(result.getValue().habitIds).toEqual([
      'habit-second',
      'habit-first',
      'habit-third',
    ]);

    expect(result.getValue().revision).toBe(5);

    expect(repository.update).toHaveBeenCalledWith(routine, 4);
  });

  it('moves a Habit one position down', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await moveDownHandler.execute(
      new MoveRoutineHabitDownCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-second',
        expectedRevision: 4,
      }),
    );

    expect(result.getValue().habitIds).toEqual([
      'habit-first',
      'habit-third',
      'habit-second',
    ]);

    expect(result.getValue().revision).toBe(5);

    expect(repository.update).toHaveBeenCalledWith(routine, 4);
  });

  it('returns a domain error when membership does not exist', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());

    const result = await removeHandler.execute(
      new RemoveRoutineHabitCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'missing-habit',
        expectedRevision: 4,
      }),
    );

    expect(result.getError()).toBeInstanceOf(RoutineHabitNotFoundException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not persist when moving beyond the first position', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());

    const result = await moveUpHandler.execute(
      new MoveRoutineHabitUpCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-first',
        expectedRevision: 4,
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(4);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not persist when moving beyond the last position', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());

    const result = await moveDownHandler.execute(
      new MoveRoutineHabitDownCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-third',
        expectedRevision: 4,
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(4);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

function createRoutine(): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-first', 'habit-second', 'habit-third'],
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
