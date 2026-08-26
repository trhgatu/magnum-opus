import {
  RoutineHabitAlreadyExistsException,
  RoutineHabitInactiveException,
  RoutineHabitReferenceNotFoundException,
} from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import { RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService } from '../../services';
import { AddRoutineHabitCommand } from '../add-routine-habit.command';
import { AddRoutineHabitHandler } from './add-routine-habit.handler';

describe('AddRoutineHabitHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const habitReader = {
    findByIdForOwner: jest.fn(),
  };

  const mutationService = new RoutineMutationService(repository as never);

  const handler = new AddRoutineHabitHandler(
    habitReader as never,
    mutationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    repository.update.mockResolvedValue(true);

    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-second',
      isActive: true,
    });
  });

  it('adds an active owned Habit to the end of the Routine', async () => {
    const routine = createRoutine(['habit-first']);
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await handler.execute(createCommand('habit-second'));

    expect(habitReader.findByIdForOwner).toHaveBeenCalledWith(
      'habit-second',
      'owner-id',
    );

    expect(result.getValue().habitIds).toEqual(['habit-first', 'habit-second']);

    expect(result.getValue().revision).toBe(5);

    expect(repository.update).toHaveBeenCalledWith(routine, 4);
  });

  it('hides a missing or foreign-owner Habit as not found', async () => {
    habitReader.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(createCommand('unavailable-habit'));

    expect(result.getError()).toBeInstanceOf(
      RoutineHabitReferenceNotFoundException,
    );

    expect(repository.findByIdForOwner).not.toHaveBeenCalled();

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not add an inactive Habit', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-second',
      isActive: false,
    });

    const result = await handler.execute(createCommand('habit-second'));

    expect(result.getError()).toBeInstanceOf(RoutineHabitInactiveException);

    expect(repository.findByIdForOwner).not.toHaveBeenCalled();

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns a domain error when the Habit already belongs to the Routine', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createRoutine(['habit-second']),
    );

    const result = await handler.execute(createCommand('habit-second'));

    expect(result.getError()).toBeInstanceOf(
      RoutineHabitAlreadyExistsException,
    );

    expect(repository.update).not.toHaveBeenCalled();
  });
});

function createCommand(habitId: string): AddRoutineHabitCommand {
  return new AddRoutineHabitCommand({
    routineId: 'routine-id',
    ownerId: 'owner-id',
    habitId,
    expectedRevision: 4,
  });
}

function createRoutine(habitIds: string[]): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds,
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
