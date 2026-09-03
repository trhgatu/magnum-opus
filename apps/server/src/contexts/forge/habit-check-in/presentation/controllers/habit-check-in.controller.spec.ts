import { Result } from '@shared/domain/result';

import {
  CheckInHabitCommand,
  UndoHabitCheckInCommand,
} from '../../application/commands';
import {
  GetHabitCheckInsQuery,
  GetHabitCheckInTodayQuery,
} from '../../application/queries';
import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { HabitCheckInDate } from '../../domain/value-objects';
import { HabitCheckInController } from './habit-check-in.controller';

describe('HabitCheckInController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new HabitCheckInController(
    commandBus as never,
    queryBus as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('checks in the authenticated owner, not an owner from input', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createCheckIn()));

    const response = await controller.checkIn('owner-id', 'habit-id');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new CheckInHabitCommand('habit-id', 'owner-id'),
    );
    expect(response).toMatchObject({
      habitId: 'habit-id',
      date: '2026-08-24',
    });
  });

  it('undoes the check-in without returning content', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    await controller.undo('owner-id', 'habit-id');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UndoHabitCheckInCommand('habit-id', 'owner-id'),
    );
  });

  it('requests history for the given range and maps it to a date list', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok([
        {
          id: 'check-in-id',
          habitId: 'habit-id',
          date: '2026-08-24',
          createdAt: new Date('2026-08-24T09:15:00.000Z'),
        },
      ]),
    );

    const response = await controller.history('owner-id', 'habit-id', {
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetHabitCheckInsQuery(
        'habit-id',
        'owner-id',
        '2026-08-01',
        '2026-08-31',
      ),
    );
    expect(response).toEqual({
      habitId: 'habit-id',
      from: '2026-08-01',
      to: '2026-08-31',
      dates: ['2026-08-24'],
    });
  });

  it("reports today's status for the owner-timezone date", async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({
        date: '2026-08-24',
        checkIn: null,
      }),
    );

    const response = await controller.today('owner-id', 'habit-id');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetHabitCheckInTodayQuery('habit-id', 'owner-id'),
    );
    expect(response).toEqual({
      date: '2026-08-24',
      checkedIn: false,
      checkIn: null,
    });
  });
});

function createCheckIn(): HabitCheckIn {
  return HabitCheckIn.create({
    habitId: 'habit-id',
    ownerId: 'owner-id',
    date: HabitCheckInDate.create('2026-08-24'),
    createdAt: new Date('2026-08-24T09:15:00.000Z'),
  });
}
