import { HabitFrequencyType, HabitType } from '../../../domain/enums';
import { HabitScheduleVersionStartedEvent } from '../../../domain/events';
import {
  HabitNotFoundException,
  HabitRevisionConflictException,
  InvalidHabitTypeException,
} from '../../../domain/exceptions';
import { Habit } from '../../../domain/habit.aggregate';
import {
  HabitCalendarDate,
  HabitFrequency,
  HabitId,
} from '../../../domain/value-objects';
import { HabitMutationService, HabitTodayService } from '../../services';
import { UpdateHabitCommand } from '../update-habit.command';
import { UpdateHabitHandler } from './update-habit.handler';

const NOT_LOADED = Symbol('not-loaded');

describe('UpdateHabitHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const mutationService = new HabitMutationService(repository as never);
  const todayService = new HabitTodayService(timeZoneReader, clock);
  const handler = new UpdateHabitHandler(mutationService, todayService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
    // 18:00 UTC ngày 08 = 01:00 ngày 09 ở Asia/Ho_Chi_Minh.
    clock.now.mockReturnValue(new Date('2026-10-08T18:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
  });

  it('updates the Habit using the expected revision', async () => {
    const habit = createHabit();
    repository.findByIdForOwner.mockResolvedValue(habit);

    const result = await handler.execute(
      updateCommand({
        title: 'Evening walk',
        description: 'After work',
        frequencyType: HabitFrequencyType.WEEKLY,
        frequencyDays: [5, 1],
      }),
    );

    expect(result.getValue().title).toBe('Evening walk');
    expect(result.getValue().frequency?.days).toEqual([1, 5]);
    expect(result.getValue().revision).toBe(2);
    expect(repository.update).toHaveBeenCalledWith(habit, 1);
  });

  it("starts a schedule version on the owner's calendar date when the frequency changes", async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit());

    const result = await handler.execute(
      updateCommand({
        frequencyType: HabitFrequencyType.WEEKLY,
        frequencyDays: [2],
      }),
    );

    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(scheduleVersionsOf(result.getValue())).toEqual([
      { frequency: 'WEEKLY:2', effectiveFrom: '2026-10-09' },
    ]);
  });

  it('records no schedule version when the frequency is unchanged', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit());

    const result = await handler.execute(
      updateCommand({ title: 'Evening walk' }),
    );

    expect(result.getValue().revision).toBe(2);
    expect(result.getValue().getDomainEvents()).toEqual([]);
  });

  it('keeps effectiveFrom monotonic after the owner moved to a western time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(1, '2026-10-09'));
    // 02:00 UTC ngày 09 vẫn là ngày 08 ở America/New_York.
    clock.now.mockReturnValue(new Date('2026-10-09T02:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('America/New_York');

    const result = await handler.execute(
      updateCommand({
        frequencyType: HabitFrequencyType.WEEKLY,
        frequencyDays: [2],
      }),
    );

    expect(scheduleVersionsOf(result.getValue())).toEqual([
      { frequency: 'WEEKLY:2', effectiveFrom: '2026-10-09' },
    ]);
  });

  it('returns not found without resolving the owner time zone or writing', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);
    timeZoneReader.getForUser.mockRejectedValue(new Error('user not found'));

    const result = await handler.execute(updateCommand());

    expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before resolving the owner time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(3));

    const result = await handler.execute(
      updateCommand({ expectedRevision: 2 }),
    );

    expect(result.getError()).toBeInstanceOf(HabitRevisionConflictException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects frequencyDays supplied without a frequencyType', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit());

    const result = await handler.execute(
      new UpdateHabitCommand({
        habitId: 'habit-id',
        ownerId: 'owner-id',
        expectedRevision: 1,
        title: 'Morning walk',
        frequencyDays: [1, 3],
      }),
    );

    expect(result.getError()).toBeInstanceOf(InvalidHabitTypeException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('fails loudly on a frequency change when the repository did not load the schedule floor', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(1, NOT_LOADED));

    await expect(
      handler.execute(
        updateCommand({
          frequencyType: HabitFrequencyType.WEEKLY,
          frequencyDays: [2],
        }),
      ),
    ).rejects.toThrow('Habit schedule floor was not loaded');
    expect(repository.update).not.toHaveBeenCalled();
  });
});

function updateCommand(
  overrides: Partial<{
    expectedRevision: number;
    title: string;
    description: string | null;
    frequencyType: HabitFrequencyType;
    frequencyDays: number[];
  }> = {},
): UpdateHabitCommand {
  return new UpdateHabitCommand({
    habitId: 'habit-id',
    ownerId: 'owner-id',
    expectedRevision: overrides.expectedRevision ?? 1,
    title: overrides.title ?? 'Morning walk',
    description: overrides.description,
    frequencyType: overrides.frequencyType ?? HabitFrequencyType.DAILY,
    frequencyDays: overrides.frequencyDays,
  });
}

function createHabit(
  revision = 1,
  openScheduleEffectiveFrom: string | typeof NOT_LOADED = '2026-08-20',
): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    type: HabitType.BUILD,
    frequency: HabitFrequency.daily(),
    quitStartedAt: null,
    isActive: true,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: HabitCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
    latestLifecycleEffectiveOn: null,
    openScheduleEffectiveFrom:
      openScheduleEffectiveFrom === NOT_LOADED
        ? undefined
        : HabitCalendarDate.fromPersistenceDate(
            new Date(`${openScheduleEffectiveFrom}T00:00:00.000Z`),
          ),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}

function scheduleVersionsOf(
  habit: Habit,
): { frequency: string; effectiveFrom: string }[] {
  return habit
    .getDomainEvents()
    .filter(
      (event): event is HabitScheduleVersionStartedEvent =>
        event instanceof HabitScheduleVersionStartedEvent,
    )
    .map((event) => ({
      frequency: `${event.frequency.type}:${event.frequency.days.join(',')}`,
      effectiveFrom: event.effectiveFrom.value,
    }));
}
