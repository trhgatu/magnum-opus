import { HabitFrequencyType, HabitType } from '../../../domain/enums';
import { HabitScheduleVersionStartedEvent } from '../../../domain/events';
import { InvalidHabitTypeException } from '../../../domain/exceptions';
import { HabitTodayService } from '../../services';
import { CreateHabitCommand } from '../create-habit.command';
import { CreateHabitHandler } from './create-habit.handler';

describe('CreateHabitHandler', () => {
  const repository = {
    create: jest.fn(),
  };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const handler = new CreateHabitHandler(
    repository as never,
    new HabitTodayService(timeZoneReader, clock),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockResolvedValue(undefined);
    clock.now.mockReturnValue(new Date('2026-10-08T18:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
  });

  it("stamps createdOn and the initial schedule version with the owner's calendar date", async () => {
    const result = await handler.execute(
      new CreateHabitCommand({
        ownerId: 'owner-id',
        title: 'Drink water',
        type: HabitType.BUILD,
        frequencyType: HabitFrequencyType.DAILY,
      }),
    );

    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(result.getValue().createdOn.value).toBe('2026-10-09');
    const [event] = result.getValue().getDomainEvents();
    expect(event).toBeInstanceOf(HabitScheduleVersionStartedEvent);
    expect(
      (event as HabitScheduleVersionStartedEvent).effectiveFrom.value,
    ).toBe('2026-10-09');
  });

  it('creates and persists a private weekly Habit', async () => {
    const result = await handler.execute(
      new CreateHabitCommand({
        ownerId: 'owner-id',
        title: '  Morning walk  ',
        description: '  Outside  ',
        type: HabitType.BUILD,
        frequencyType: HabitFrequencyType.WEEKLY,
        frequencyDays: [5, 1, 5],
      }),
    );

    const habit = result.getValue();
    expect(habit.ownerId).toBe('owner-id');
    expect(habit.title).toBe('Morning walk');
    expect(habit.description).toBe('Outside');
    expect(habit.frequency?.days).toEqual([1, 5]);
    expect(habit.revision).toBe(1);
    expect(repository.create).toHaveBeenCalledWith(habit);
  });

  it('creates a daily Habit with no weekdays', async () => {
    const result = await handler.execute(
      new CreateHabitCommand({
        ownerId: 'owner-id',
        title: 'Drink water',
        type: HabitType.BUILD,
        frequencyType: HabitFrequencyType.DAILY,
      }),
    );

    expect(result.getValue().frequency?.days).toEqual([]);
  });

  it('creates a QUIT Habit defaulting quitStartedAt to today', async () => {
    const result = await handler.execute(
      new CreateHabitCommand({
        ownerId: 'owner-id',
        title: 'Quit smoking',
        type: HabitType.QUIT,
      }),
    );

    const habit = result.getValue();
    expect(habit.frequency).toBeNull();
    expect(habit.quitStartedAt).not.toBeNull();
  });

  it('rejects frequencyDays supplied without a frequencyType', async () => {
    await expect(
      handler.execute(
        new CreateHabitCommand({
          ownerId: 'owner-id',
          title: 'Quit smoking',
          type: HabitType.QUIT,
          frequencyDays: [1, 3],
        }),
      ),
    ).rejects.toBeInstanceOf(InvalidHabitTypeException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
