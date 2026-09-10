import { Result } from '@shared/domain/result';

import { LogRelapseCommand } from '../../application/commands';
import { GetHabitProgressQuery } from '../../application/queries';
import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitRelapseController } from './habit-relapse.controller';

describe('HabitRelapseController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new HabitRelapseController(
    commandBus as never,
    queryBus as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('logs a relapse for the authenticated owner', async () => {
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T10:00:00.000Z'),
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    });
    commandBus.execute.mockResolvedValue(Result.ok(relapse));

    const response = await controller.logRelapse('owner-id', 'habit-id');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new LogRelapseCommand('habit-id', 'owner-id'),
    );
    expect(response).toEqual({
      id: relapse.id,
      habitId: 'habit-id',
      occurredAt: '2026-08-20T10:00:00.000Z',
    });
  });

  it('returns progress for the authenticated owner', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({
        habitId: 'habit-id',
        since: '2026-08-20',
        sinceReason: 'RELAPSE',
        daysSince: 7,
      }),
    );

    const response = await controller.progress('owner-id', 'habit-id');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetHabitProgressQuery('habit-id', 'owner-id'),
    );
    expect(response).toEqual({
      habitId: 'habit-id',
      since: '2026-08-20',
      sinceReason: 'RELAPSE',
      daysSince: 7,
    });
  });
});
