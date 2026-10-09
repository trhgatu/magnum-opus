import { RoutineLifecycleAction } from '../../../domain/enums';
import { RoutineLifecycleTransitionedEvent } from '../../../domain/events';
import { Routine } from '../../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService, RoutineTodayService } from '../../services';
import { ArchiveRoutineCommand } from '../archive-routine.command';
import { RestoreRoutineCommand } from '../restore-routine.command';
import { ArchiveRoutineHandler } from './archive-routine.handler';
import { RestoreRoutineHandler } from './restore-routine.handler';

describe('Routine lifecycle command handlers', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const mutationService = new RoutineMutationService(repository as never);
  const todayService = new RoutineTodayService(timeZoneReader, clock);

  const archiveHandler = new ArchiveRoutineHandler(
    mutationService,
    todayService,
  );

  const restoreHandler = new RestoreRoutineHandler(
    mutationService,
    todayService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
    // 18:00 UTC ngày 08 = 01:00 ngày 09 ở Asia/Ho_Chi_Minh.
    clock.now.mockReturnValue(new Date('2026-10-08T18:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
  });

  it("archives an active Routine effective on the owner's calendar date", async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine(true, 1));

    const result = await archiveHandler.execute(
      new ArchiveRoutineCommand('routine-id', 'owner-id', 1),
    );

    const routine = result.getValue();
    expect(routine.isActive).toBe(false);
    expect(routine.revision).toBe(2);
    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(transitionsOf(routine)).toEqual([
      { action: RoutineLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
    ]);
    expect(repository.update).toHaveBeenCalledWith(routine, 1);
  });

  it("restores an archived Routine effective on the owner's calendar date", async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine(false, 4));

    const result = await restoreHandler.execute(
      new RestoreRoutineCommand('routine-id', 'owner-id', 4),
    );

    const routine = result.getValue();
    expect(routine.isActive).toBe(true);
    expect(routine.revision).toBe(5);
    expect(transitionsOf(routine)).toEqual([
      { action: RoutineLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
    ]);
  });

  it('keeps effectiveOn monotonic after the owner moved to a western time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createRoutine(false, 4, '2026-10-09'),
    );
    // 02:00 UTC ngày 09 vẫn là ngày 08 ở America/New_York.
    clock.now.mockReturnValue(new Date('2026-10-09T02:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('America/New_York');

    const result = await restoreHandler.execute(
      new RestoreRoutineCommand('routine-id', 'owner-id', 4),
    );

    expect(transitionsOf(result.getValue())).toEqual([
      { action: RoutineLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
    ]);
  });
});

function createRoutine(
  isActive: boolean,
  revision: number,
  latestLifecycleEffectiveOn: string | null = null,
): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-id'],
    isActive,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    createdOn: RoutineCalendarDate.fromPersistenceDate(
      new Date('2026-08-20T00:00:00.000Z'),
    ),
    latestLifecycleEffectiveOn: latestLifecycleEffectiveOn
      ? RoutineCalendarDate.fromPersistenceDate(
          new Date(`${latestLifecycleEffectiveOn}T00:00:00.000Z`),
        )
      : null,
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}

function transitionsOf(
  routine: Routine,
): { action: RoutineLifecycleAction; effectiveOn: string }[] {
  return routine
    .getDomainEvents()
    .filter(
      (event): event is RoutineLifecycleTransitionedEvent =>
        event instanceof RoutineLifecycleTransitionedEvent,
    )
    .map((event) => ({
      action: event.action,
      effectiveOn: event.effectiveOn.value,
    }));
}
