import { RoutineHabitAddedEvent } from '../../../domain/events';
import {
  HabitTypeNotAllowedInRoutineException,
  RoutineHabitAlreadyExistsException,
  RoutineHabitInactiveException,
  RoutineHabitReferenceNotFoundException,
  RoutineNotFoundException,
  RoutineRevisionConflictException,
} from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService, RoutineTodayService } from '../../services';
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

  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const mutationService = new RoutineMutationService(repository as never);
  const todayService = new RoutineTodayService(timeZoneReader, clock);

  const handler = new AddRoutineHabitHandler(
    habitReader,
    mutationService,
    todayService,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    repository.update.mockResolvedValue(true);
    // 18:00 UTC ngày 08 = 01:00 ngày 09 ở Asia/Ho_Chi_Minh.
    clock.now.mockReturnValue(new Date('2026-10-08T18:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');

    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-second',
      isActive: true,
      type: 'BUILD',
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

  it("records the addition on the owner's calendar date", async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createRoutine(['habit-first']),
    );

    const result = await handler.execute(createCommand('habit-second'));

    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');

    const [event] = result.getValue().getDomainEvents();
    expect(event).toBeInstanceOf(RoutineHabitAddedEvent);
    expect(event).toMatchObject({
      routineId: 'routine-id',
      ownerId: 'owner-id',
      habitId: 'habit-second',
    });
    expect((event as RoutineHabitAddedEvent).addedOn.value).toBe('2026-10-09');
  });

  it('returns RoutineNotFoundException without resolving the owner time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);
    timeZoneReader.getForUser.mockRejectedValue(new Error('user not found'));

    const result = await handler.execute(createCommand('habit-second'));

    expect(result.getError()).toBeInstanceOf(RoutineNotFoundException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns a revision conflict without resolving the owner time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createRoutine(['habit-first'], 5),
    );

    const result = await handler.execute(createCommand('habit-second'));

    expect(result.getError()).toBeInstanceOf(RoutineRevisionConflictException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
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
      type: 'BUILD',
    });

    const result = await handler.execute(createCommand('habit-second'));

    expect(result.getError()).toBeInstanceOf(RoutineHabitInactiveException);

    expect(repository.findByIdForOwner).not.toHaveBeenCalled();

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not add a QUIT-type Habit', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-second',
      isActive: true,
      type: 'QUIT',
    });

    const result = await handler.execute(createCommand('habit-second'));

    expect(result.getError()).toBeInstanceOf(
      HabitTypeNotAllowedInRoutineException,
    );

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

function createRoutine(habitIds: string[], revision = 4): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds,
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
