import { Result } from '@shared/domain/result';

import {
  AddRoutineHabitCommand,
  ArchiveRoutineCommand,
  CreateRoutineCommand,
  MoveRoutineHabitUpCommand,
  RemoveRoutineHabitCommand,
  UpdateRoutineTitleCommand,
} from '../../application/commands';
import {
  GetAvailableRoutineHabitsQuery,
  GetRoutinesQuery,
  GetRoutineQuery,
} from '../../application/queries';
import { Routine } from '../../domain/routine.aggregate';
import { RoutineId } from '../../domain/value-objects';
import { RoutineController } from './routine.controller';

import type { RoutineDetailReadModel } from '../../application/ports/routine-reader.port';

describe('RoutineController', () => {
  const commandBus = {
    execute: jest.fn(),
  };

  const queryBus = {
    execute: jest.fn(),
  };

  const controller = new RoutineController(
    commandBus as never,
    queryBus as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a Routine for the authenticated owner', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createRoutine()));

    const response = await controller.create('owner-id', {
      title: 'Morning ritual',
    });

    const command = commandBus.execute.mock.calls[0]?.[0];

    expect(command).toBeInstanceOf(CreateRoutineCommand);

    expect(command).toMatchObject({
      ownerId: 'owner-id',
      title: 'Morning ritual',
    });

    expect(response.id).toBe('routine-id');
    expect(response).not.toHaveProperty('ownerId');
  });

  it('returns the owned Routine detail with ordered Habit summaries', async () => {
    const detail: RoutineDetailReadModel = {
      id: 'routine-id',
      title: 'Morning ritual',
      isActive: true,
      revision: 4,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
      habits: [
        {
          id: 'habit-first',
          title: 'Drink water',
          isActive: true,
          order: 1,
        },
        {
          id: 'habit-second',
          title: 'Read',
          isActive: false,
          order: 2,
        },
      ],
    };

    queryBus.execute.mockResolvedValue(Result.ok(detail));

    const response = await controller.findOne('owner-id', 'routine-id');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetRoutineQuery('routine-id', 'owner-id'),
    );

    expect(response).toEqual({
      id: 'routine-id',
      title: 'Morning ritual',
      isActive: true,
      revision: 4,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-21T10:00:00.000Z',
      habits: [
        {
          id: 'habit-first',
          title: 'Drink water',
          isActive: true,
          order: 1,
        },
        {
          id: 'habit-second',
          title: 'Read',
          isActive: false,
          order: 2,
        },
      ],
    });

    expect(response).not.toHaveProperty('ownerId');
    expect(response).not.toHaveProperty('habitIds');
  });

  it('maps list status and returns pagination metadata', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({
        routines: [createRoutine()],
        total: 1,
      }),
    );

    const response = await controller.findAll('owner-id', {
      page: 2,
      limit: 10,
      status: 'ARCHIVED',
      search: 'ritual',
      sortBy: 'title',
      sortOrder: 'asc',
    });

    const query = queryBus.execute.mock.calls[0]?.[0];

    expect(query).toBeInstanceOf(GetRoutinesQuery);

    expect(query).toMatchObject({
      ownerId: 'owner-id',
      page: 2,
      limit: 10,
      isActive: false,
      search: 'ritual',
      sortBy: 'title',
      sortOrder: 'asc',
    });

    expect(response.meta).toEqual({
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 2,
    });
  });

  it('sends the expected revision when updating title', async () => {
    const routine = createRoutine();
    routine.updateTitle('Evening ritual');

    commandBus.execute.mockResolvedValue(Result.ok(routine));

    await controller.updateTitle('owner-id', 'routine-id', {
      title: 'Evening ritual',
      expectedRevision: 4,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateRoutineTitleCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        title: 'Evening ritual',
        expectedRevision: 4,
      }),
    );
  });

  it('adds a Habit using the authenticated owner', async () => {
    const routine = createRoutine();
    routine.addHabit('habit-third');

    commandBus.execute.mockResolvedValue(Result.ok(routine));

    await controller.addHabit('owner-id', 'routine-id', {
      habitId: 'habit-third',
      expectedRevision: 4,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new AddRoutineHabitCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-third',
        expectedRevision: 4,
      }),
    );
  });

  it('removes a Habit using query revision', async () => {
    const routine = createRoutine();
    routine.removeHabit('habit-second');

    commandBus.execute.mockResolvedValue(Result.ok(routine));

    await controller.removeHabit('owner-id', 'routine-id', 'habit-second', {
      expectedRevision: 4,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RemoveRoutineHabitCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-second',
        expectedRevision: 4,
      }),
    );
  });

  it('maps move-up to its explicit command', async () => {
    const routine = createRoutine();
    routine.moveHabitUp('habit-second');

    commandBus.execute.mockResolvedValue(Result.ok(routine));

    await controller.moveHabitUp('owner-id', 'routine-id', 'habit-second', {
      expectedRevision: 4,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new MoveRoutineHabitUpCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        habitId: 'habit-second',
        expectedRevision: 4,
      }),
    );
  });

  it('sends the expected revision when archiving', async () => {
    const routine = createRoutine();
    routine.archive();

    commandBus.execute.mockResolvedValue(Result.ok(routine));

    await controller.archive('owner-id', 'routine-id', {
      expectedRevision: 4,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new ArchiveRoutineCommand('routine-id', 'owner-id', 4),
    );
  });

  it('returns paginated Habit options available to the owned Routine', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({
        habits: [
          {
            id: 'habit-id',
            title: 'Drink water',
          },
        ],
        total: 21,
      }),
    );

    const response = await controller.findAvailableHabits(
      'owner-id',
      'routine-id',
      {
        page: 2,
        limit: 20,
        search: 'water',
      },
    );

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetAvailableRoutineHabitsQuery(
        'routine-id',
        'owner-id',
        2,
        20,
        'water',
      ),
    );

    expect(response).toEqual({
      data: [
        {
          id: 'habit-id',
          title: 'Drink water',
        },
      ],
      meta: {
        totalItems: 21,
        itemCount: 1,
        itemsPerPage: 20,
        totalPages: 2,
        currentPage: 2,
      },
    });
  });
});

function createRoutine(): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-first', 'habit-second'],
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  });
}
