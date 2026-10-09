import { HabitLifecycleAction, HabitType } from '../../../domain/enums';
import { HabitLifecycleTransitionedEvent } from '../../../domain/events';
import { Habit } from '../../../domain/habit.aggregate';
import {
  HabitCalendarDate,
  HabitFrequency,
  HabitId,
} from '../../../domain/value-objects';
import { HabitMutationService, HabitTodayService } from '../../services';
import { ArchiveHabitCommand } from '../archive-habit.command';
import { RestoreHabitCommand } from '../restore-habit.command';
import { ArchiveHabitHandler } from './archive-habit.handler';
import { RestoreHabitHandler } from './restore-habit.handler';

describe('Habit lifecycle command handlers', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const mutationService = new HabitMutationService(repository as never);
  const todayService = new HabitTodayService(timeZoneReader, clock);
  const archiveHandler = new ArchiveHabitHandler(mutationService, todayService);
  const restoreHandler = new RestoreHabitHandler(mutationService, todayService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
    // 18:00 UTC ngày 08 = 01:00 ngày 09 ở Asia/Ho_Chi_Minh.
    clock.now.mockReturnValue(new Date('2026-10-08T18:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
  });

  it("archives an active Habit effective on the owner's calendar date", async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(true, 1));

    const result = await archiveHandler.execute(
      new ArchiveHabitCommand('habit-id', 'owner-id', 1),
    );

    const habit = result.getValue();
    expect(habit.isActive).toBe(false);
    expect(habit.revision).toBe(2);
    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(transitionsOf(habit)).toEqual([
      { action: HabitLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
    ]);
    expect(repository.update).toHaveBeenCalledWith(habit, 1);
  });

  it("restores an archived Habit effective on the owner's calendar date", async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(false, 4));

    const result = await restoreHandler.execute(
      new RestoreHabitCommand('habit-id', 'owner-id', 4),
    );

    const habit = result.getValue();
    expect(habit.isActive).toBe(true);
    expect(habit.revision).toBe(5);
    expect(transitionsOf(habit)).toEqual([
      { action: HabitLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
    ]);
  });

  it('keeps effectiveOn monotonic after the owner moved to a western time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createHabit(false, 4, '2026-10-09'),
    );
    // 02:00 UTC ngày 09 vẫn là ngày 08 ở America/New_York.
    clock.now.mockReturnValue(new Date('2026-10-09T02:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('America/New_York');

    const result = await restoreHandler.execute(
      new RestoreHabitCommand('habit-id', 'owner-id', 4),
    );

    expect(transitionsOf(result.getValue())).toEqual([
      { action: HabitLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
    ]);
  });
});

function createHabit(
  isActive: boolean,
  revision: number,
  latestLifecycleEffectiveOn: string | null = null,
): Habit {
  return Habit.rehydrate({
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: null,
    type: HabitType.BUILD,
    frequency: HabitFrequency.daily(),
    quitStartedAt: null,
    isActive,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: HabitCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
    latestLifecycleEffectiveOn: latestLifecycleEffectiveOn
      ? HabitCalendarDate.fromPersistenceDate(
          new Date(`${latestLifecycleEffectiveOn}T00:00:00.000Z`),
        )
      : null,
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}

function transitionsOf(
  habit: Habit,
): { action: HabitLifecycleAction; effectiveOn: string }[] {
  return habit
    .getDomainEvents()
    .filter(
      (event): event is HabitLifecycleTransitionedEvent =>
        event instanceof HabitLifecycleTransitionedEvent,
    )
    .map((event) => ({
      action: event.action,
      effectiveOn: event.effectiveOn.value,
    }));
}
