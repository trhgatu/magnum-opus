import {
  HabitNotFoundException,
  HabitProgressNotApplicableException,
} from '../../../domain/exceptions';
import { GetHabitProgressQuery } from '../get-habit-progress.query';
import { GetHabitProgressHandler } from './get-habit-progress.handler';

describe('GetHabitProgressHandler', () => {
  const habitReader = { findByIdForOwner: jest.fn() };
  const progressReader = { getProgressFor: jest.fn() };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const handler = new GetHabitProgressHandler(
    habitReader,
    progressReader,
    timeZoneReader,
    clock,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    timeZoneReader.getForUser.mockResolvedValue('UTC');
    clock.now.mockReturnValue(new Date('2026-08-27T12:00:00.000Z'));
  });

  it('returns not found when the Habit does not exist', async () => {
    habitReader.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetHabitProgressQuery('habit-id', 'owner-id'),
    );

    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
  });

  it('rejects a BUILD-type Habit', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'BUILD',
    });

    const result = await handler.execute(
      new GetHabitProgressQuery('habit-id', 'owner-id'),
    );

    expect(result.getError()).toBeInstanceOf(
      HabitProgressNotApplicableException,
    );
  });

  it('computes days since the most recent relapse', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'QUIT',
    });
    progressReader.getProgressFor.mockResolvedValue({
      sinceDate: new Date('2026-08-20T09:00:00.000Z'),
      sinceReason: 'RELAPSE',
    });

    const result = await handler.execute(
      new GetHabitProgressQuery('habit-id', 'owner-id'),
    );

    expect(result.getValue()).toEqual({
      habitId: 'habit-id',
      since: '2026-08-20',
      sinceReason: 'RELAPSE',
      daysSince: 7,
    });
  });

  it('falls back to quitStartedAt when there is no relapse', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'QUIT',
    });
    progressReader.getProgressFor.mockResolvedValue({
      sinceDate: new Date('2026-08-15T00:00:00.000Z'),
      sinceReason: 'QUIT_STARTED_AT',
    });

    const result = await handler.execute(
      new GetHabitProgressQuery('habit-id', 'owner-id'),
    );

    expect(result.getValue()).toEqual({
      habitId: 'habit-id',
      since: '2026-08-15',
      sinceReason: 'QUIT_STARTED_AT',
      daysSince: 12,
    });
  });

  it('resolves the calendar day boundary using the owner timezone', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'QUIT',
    });
    timeZoneReader.getForUser.mockResolvedValue('Pacific/Kiritimati');
    // 2026-08-27T12:00:00Z is already 2026-08-28 in UTC+14
    progressReader.getProgressFor.mockResolvedValue({
      sinceDate: new Date('2026-08-27T23:00:00.000Z'),
      sinceReason: 'RELAPSE',
    });

    const result = await handler.execute(
      new GetHabitProgressQuery('habit-id', 'owner-id'),
    );

    expect(result.getValue()).toEqual({
      habitId: 'habit-id',
      since: '2026-08-28',
      sinceReason: 'RELAPSE',
      daysSince: 0,
    });
  });
});
