import { HabitLifecycleAction, HabitType } from '../../../domain/enums';
import { HabitLifecycleTransitionedEvent } from '../../../domain/events';
import {
  HabitNotFoundException,
  HabitRevisionConflictException,
} from '../../../domain/exceptions';
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

const NOT_LOADED = Symbol('not-loaded');
const archiveCommand = new ArchiveHabitCommand('habit-id', 'owner-id', 1);
const restoreCommand = new RestoreHabitCommand('habit-id', 'owner-id', 1);

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

  it('clamps an archive to createdOn when the owner is now west of where the Habit was created', async () => {
    // 16:00 UTC ngày 08: ở Asia/Tokyo (+09:00) đã là ngày 09, ở
    // America/Los_Angeles vẫn là ngày 08 — mốc sàn createdOn quyết định.
    const instant = new Date('2026-10-08T16:00:00.000Z');
    const habit = Habit.create({
      ownerId: 'owner-id',
      title: 'Morning walk',
      type: HabitType.BUILD,
      frequency: HabitFrequency.daily(),
      today: HabitCalendarDate.fromInstant(instant, 'Asia/Tokyo'),
    });
    repository.findByIdForOwner.mockResolvedValue(habit);
    clock.now.mockReturnValue(instant);
    timeZoneReader.getForUser.mockResolvedValue('America/Los_Angeles');

    const result = await archiveHandler.execute(
      new ArchiveHabitCommand(habit.id, 'owner-id', 1),
    );

    expect(habit.createdOn.value).toBe('2026-10-09');
    expect(transitionsOf(result.getValue())).toEqual([
      { action: HabitLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
    ]);
  });

  it.each([
    ['archive', () => archiveHandler.execute(archiveCommand)],
    ['restore', () => restoreHandler.execute(restoreCommand)],
  ])(
    'returns HabitNotFoundException on %s without resolving the owner time zone',
    async (_, execute) => {
      repository.findByIdForOwner.mockResolvedValue(null);
      timeZoneReader.getForUser.mockRejectedValue(new Error('user not found'));

      const result = await execute();

      expect(result.getError()).toBeInstanceOf(HabitNotFoundException);
      expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it('returns a revision conflict without resolving the owner time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(createHabit(true, 2));

    const result = await archiveHandler.execute(archiveCommand);

    expect(result.getError()).toBeInstanceOf(HabitRevisionConflictException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
  });

  it.each([
    ['archive', true, () => archiveHandler.execute(archiveCommand)],
    ['restore', false, () => restoreHandler.execute(restoreCommand)],
  ])(
    'fails loudly on %s when the repository did not load the lifecycle floor',
    async (_, isActive, execute) => {
      repository.findByIdForOwner.mockResolvedValue(
        createHabit(isActive, 1, NOT_LOADED),
      );

      await expect(execute()).rejects.toThrow(
        'Habit lifecycle floor was not loaded',
      );
      expect(repository.update).not.toHaveBeenCalled();
    },
  );
});

function createHabit(
  isActive: boolean,
  revision: number,
  latestLifecycleEffectiveOn: string | null | typeof NOT_LOADED = null,
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
    latestLifecycleEffectiveOn:
      latestLifecycleEffectiveOn === NOT_LOADED
        ? undefined
        : latestLifecycleEffectiveOn
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
