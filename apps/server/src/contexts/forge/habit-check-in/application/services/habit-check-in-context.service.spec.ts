import {
  HabitCheckInForbiddenException,
  HabitCheckInNotFoundException,
} from '../../domain/exceptions';
import { HabitCheckInContextService } from './habit-check-in-context.service';

describe('HabitCheckInContextService', () => {
  const habitReader = { findByIdForOwner: jest.fn() };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const service = new HabitCheckInContextService(
    habitReader,
    timeZoneReader,
    clock,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    timeZoneReader.getForUser.mockResolvedValue('UTC');
    clock.now.mockReturnValue(new Date('2026-08-24T18:30:00.000Z'));
  });

  it('throws not found when the Habit does not exist', async () => {
    habitReader.findByIdForOwner.mockResolvedValue(null);

    await expect(
      service.currentDateForOwnedHabit('habit-id', 'owner-id', true),
    ).rejects.toBeInstanceOf(HabitCheckInNotFoundException);
  });

  it('allows check-in for an active BUILD-type Habit', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'BUILD',
    });

    await expect(
      service.currentDateForOwnedHabit('habit-id', 'owner-id', true, true),
    ).resolves.toMatchObject({ date: expect.anything() });
  });

  it('rejects check-in for a QUIT-type Habit when requireBuildType is set', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'QUIT',
    });

    await expect(
      service.currentDateForOwnedHabit('habit-id', 'owner-id', true, true),
    ).rejects.toBeInstanceOf(HabitCheckInForbiddenException);
  });

  it('does not enforce BUILD type when requireBuildType is omitted', async () => {
    habitReader.findByIdForOwner.mockResolvedValue({
      id: 'habit-id',
      isActive: true,
      type: 'QUIT',
    });

    await expect(
      service.currentDateForOwnedHabit('habit-id', 'owner-id', false),
    ).resolves.toMatchObject({ date: expect.anything() });
  });
});
