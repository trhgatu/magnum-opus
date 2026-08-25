import { Result } from '@shared/domain/result';

import {
  ArchiveHabitCommand,
  CreateHabitCommand,
} from '../../application/commands';
import { GetHabitsQuery } from '../../application/queries';
import { HabitFrequencyType } from '../../domain/enums';
import { Habit } from '../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../domain/value-objects';
import { HabitController } from './habit.controller';

describe('HabitController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new HabitController(
    commandBus as never,
    queryBus as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a Habit for the authenticated owner, not an owner from input', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createHabit()));

    const response = await controller.create('owner-id', {
      title: 'Morning walk',
      description: null,
      frequencyType: HabitFrequencyType.WEEKLY,
      frequencyDays: [1, 5],
    });

    const command = commandBus.execute.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(CreateHabitCommand);
    expect(command).toMatchObject({
      ownerId: 'owner-id',
      title: 'Morning walk',
      frequencyDays: [1, 5],
    });
    expect(response.id).toBe('habit-id');
    expect(response).not.toHaveProperty('ownerId');
  });

  it('maps list query status and returns pagination metadata', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({ habits: [createHabit()], total: 1 }),
    );

    const response = await controller.findAll('owner-id', {
      page: 2,
      limit: 10,
      status: 'ARCHIVED',
      search: 'walk',
      sortBy: 'title',
      sortOrder: 'asc',
    });

    const query = queryBus.execute.mock.calls[0]?.[0];
    expect(query).toBeInstanceOf(GetHabitsQuery);
    expect(query).toMatchObject({
      ownerId: 'owner-id',
      page: 2,
      limit: 10,
      isActive: false,
      search: 'walk',
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

  it('sends the expected revision when archiving', async () => {
    const habit = createHabit();
    habit.archive();
    commandBus.execute.mockResolvedValue(Result.ok(habit));

    await controller.archive('owner-id', 'habit-id', {
      expectedRevision: 1,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new ArchiveHabitCommand('habit-id', 'owner-id', 1),
    );
  });
});

function createHabit(): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    frequency: HabitFrequency.weekly([1, 5]),
    isActive: true,
    revision: 1,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
