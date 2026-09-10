import {
  HabitNotFoundException,
  HabitRelapseForbiddenException,
} from '../../../domain/exceptions';
import { LogRelapseCommand } from '../log-relapse.command';
import { LogRelapseHandler } from './log-relapse.handler';

describe('LogRelapseHandler', () => {
  const repository = { create: jest.fn() };
  const habitReader = { findByIdForOwner: jest.fn() };
  const clock = { now: jest.fn() };

  const handler = new LogRelapseHandler(repository, habitReader, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    clock.now.mockReturnValue(new Date('2026-08-20T10:00:00.000Z'));
  });

  it('logs a relapse for an active QUIT-type Habit', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'QUIT',
    });
    repository.create.mockResolvedValue(undefined);

    const result = await handler.execute(
      new LogRelapseCommand('habit-id', 'owner-id'),
    );

    const relapse = result.getValue();
    expect(relapse.habitId).toBe('habit-id');
    expect(relapse.ownerId).toBe('owner-id');
    expect(relapse.occurredAt).toEqual(new Date('2026-08-20T10:00:00.000Z'));
    expect(repository.create).toHaveBeenCalledWith(relapse);
  });

  it('allows logging multiple relapses without idempotency', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'QUIT',
    });
    repository.create.mockResolvedValue(undefined);

    const command = new LogRelapseCommand('habit-id', 'owner-id');
    const first = (await handler.execute(command)).getValue();
    const second = (await handler.execute(command)).getValue();

    expect(first.id).not.toBe(second.id);
    expect(repository.create).toHaveBeenCalledTimes(2);
  });

  it('returns not found when the Habit does not exist', async () => {
    habitReader.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new LogRelapseCommand('habit-id', 'owner-id'),
    );

    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects logging for an archived Habit', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: false,
      type: 'QUIT',
    });

    const result = await handler.execute(
      new LogRelapseCommand('habit-id', 'owner-id'),
    );

    expect(result.getError()).toBeInstanceOf(HabitRelapseForbiddenException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects logging for a BUILD-type Habit', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'BUILD',
    });

    const result = await handler.execute(
      new LogRelapseCommand('habit-id', 'owner-id'),
    );

    expect(result.getError()).toBeInstanceOf(HabitRelapseForbiddenException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
