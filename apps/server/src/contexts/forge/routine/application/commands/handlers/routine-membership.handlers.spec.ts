import { RoutineHabitRemovedEvent } from '../../../domain/events';
import {
  InvalidRoutineHabitReorderException,
  RoutineHabitNotFoundException,
  RoutineNotFoundException,
  RoutineRevisionConflictException,
} from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService, RoutineTodayService } from '../../services';
import { MoveRoutineHabitDownCommand } from '../move-routine-habit-down.command';
import { MoveRoutineHabitUpCommand } from '../move-routine-habit-up.command';
import { RemoveRoutineHabitCommand } from '../remove-routine-habit.command';
import { ReorderRoutineHabitsCommand } from '../reorder-routine-habits.command';
import { MoveRoutineHabitDownHandler } from './move-routine-habit-down.handler';
import { MoveRoutineHabitUpHandler } from './move-routine-habit-up.handler';
import { RemoveRoutineHabitHandler } from './remove-routine-habit.handler';
import { ReorderRoutineHabitsHandler } from './reorder-routine-habits.handler';

describe('Routine membership command handlers', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const mutationService = new RoutineMutationService(repository as never);
  const todayService = new RoutineTodayService(timeZoneReader, clock);

  const removeHandler = new RemoveRoutineHabitHandler(
    mutationService,
    todayService,
  );

  const moveUpHandler = new MoveRoutineHabitUpHandler(mutationService);

  const moveDownHandler = new MoveRoutineHabitDownHandler(mutationService);

  const reorderHandler = new ReorderRoutineHabitsHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
    // 18:00 UTC ngày 08 = 01:00 ngày 09 ở Asia/Ho_Chi_Minh.
    clock.now.mockReturnValue(new Date('2026-10-08T18:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
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

  it("records the removal on the owner's calendar date", async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());

    const result = await removeHandler.execute(
      createRemoveCommand('habit-second'),
    );

    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');

    const [event] = result.getValue().getDomainEvents();
    expect(event).toBeInstanceOf(RoutineHabitRemovedEvent);
    expect(event).toMatchObject({
      routineId: 'routine-id',
      ownerId: 'owner-id',
      habitId: 'habit-second',
    });
    expect((event as RoutineHabitRemovedEvent).removedOn.value).toBe(
      '2026-10-09',
    );
  });

  it('returns RoutineNotFoundException on remove without resolving the owner time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);
    timeZoneReader.getForUser.mockRejectedValue(new Error('user not found'));

    const result = await removeHandler.execute(
      createRemoveCommand('habit-second'),
    );

    expect(result.getError()).toBeInstanceOf(RoutineNotFoundException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns a revision conflict on remove without resolving the owner time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine(5));

    const result = await removeHandler.execute(
      createRemoveCommand('habit-second'),
    );

    expect(result.getError()).toBeInstanceOf(RoutineRevisionConflictException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not resolve the owner time zone when reordering', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());

    const result = await moveUpHandler.execute(
      new MoveRoutineHabitUpCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-second',
        expectedRevision: 4,
      }),
    );

    expect(result.getValue().getDomainEvents()).toEqual([]);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
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

  it('reorders every Habit at once', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await reorderHandler.execute(
      new ReorderRoutineHabitsCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitIds: ['habit-third', 'habit-first', 'habit-second'],
        expectedRevision: 4,
      }),
    );

    expect(result.getValue().habitIds).toEqual([
      'habit-third',
      'habit-first',
      'habit-second',
    ]);
    expect(result.getValue().revision).toBe(5);
    expect(repository.update).toHaveBeenCalledWith(routine, 4);
  });

  it('returns a domain error when the reordered list drops a Habit', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());

    const result = await reorderHandler.execute(
      new ReorderRoutineHabitsCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitIds: ['habit-first', 'habit-second'],
        expectedRevision: 4,
      }),
    );

    expect(result.getError()).toBeInstanceOf(
      InvalidRoutineHabitReorderException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not persist when the reordered list is identical', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine());

    const result = await reorderHandler.execute(
      new ReorderRoutineHabitsCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitIds: ['habit-first', 'habit-second', 'habit-third'],
        expectedRevision: 4,
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(4);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

function createRemoveCommand(habitId: string): RemoveRoutineHabitCommand {
  return new RemoveRoutineHabitCommand({
    routineId: 'routine-id',
    ownerId: 'owner-id',
    habitId,
    expectedRevision: 4,
  });
}

function createRoutine(revision = 4): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-first', 'habit-second', 'habit-third'],
    isActive: true,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: RoutineCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
    latestLifecycleEffectiveOn: null,
    membershipFloors: new Map(),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
