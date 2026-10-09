import { RoutineLifecycleAction } from '../../../domain/enums';
import { RoutineLifecycleTransitionedEvent } from '../../../domain/events';
import {
  RoutineNotFoundException,
  RoutineRevisionConflictException,
} from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService, RoutineTodayService } from '../../services';
import { ArchiveRoutineCommand } from '../archive-routine.command';
import { RestoreRoutineCommand } from '../restore-routine.command';
import { ArchiveRoutineHandler } from './archive-routine.handler';
import { RestoreRoutineHandler } from './restore-routine.handler';

const NOT_LOADED = Symbol('not-loaded');
const archiveCommand = new ArchiveRoutineCommand('routine-id', 'owner-id', 1);
const restoreCommand = new RestoreRoutineCommand('routine-id', 'owner-id', 1);

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

  it('clamps an archive to createdOn when the owner is now west of where the Routine was created', async () => {
    // 16:00 UTC ngày 08: ở Asia/Tokyo (+09:00) đã là ngày 09, ở
    // America/Los_Angeles vẫn là ngày 08 — mốc sàn createdOn quyết định.
    const instant = new Date('2026-10-08T16:00:00.000Z');
    const routine = Routine.create({
      ownerId: 'owner-id',
      title: 'Morning ritual',
      today: RoutineCalendarDate.fromInstant(instant, 'Asia/Tokyo'),
    });
    repository.findByIdForOwner.mockResolvedValue(routine);
    clock.now.mockReturnValue(instant);
    timeZoneReader.getForUser.mockResolvedValue('America/Los_Angeles');

    const result = await archiveHandler.execute(
      new ArchiveRoutineCommand(routine.id, 'owner-id', 1),
    );

    expect(routine.createdOn.value).toBe('2026-10-09');
    expect(transitionsOf(result.getValue())).toEqual([
      { action: RoutineLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
    ]);
  });

  it.each([
    ['archive', () => archiveHandler.execute(archiveCommand)],
    ['restore', () => restoreHandler.execute(restoreCommand)],
  ])(
    'returns RoutineNotFoundException on %s without resolving the owner time zone',
    async (_, execute) => {
      repository.findByIdForOwner.mockResolvedValue(null);
      timeZoneReader.getForUser.mockRejectedValue(new Error('user not found'));

      const result = await execute();

      expect(result.getError()).toBeInstanceOf(RoutineNotFoundException);
      expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it('returns a revision conflict without resolving the owner time zone', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine(true, 2));

    const result = await archiveHandler.execute(archiveCommand);

    expect(result.getError()).toBeInstanceOf(RoutineRevisionConflictException);
    expect(timeZoneReader.getForUser).not.toHaveBeenCalled();
  });

  it.each([
    ['archive', true, () => archiveHandler.execute(archiveCommand)],
    ['restore', false, () => restoreHandler.execute(restoreCommand)],
  ])(
    'fails loudly on %s when the repository did not load the lifecycle floor',
    async (_, isActive, execute) => {
      repository.findByIdForOwner.mockResolvedValue(
        createRoutine(isActive, 1, NOT_LOADED),
      );

      await expect(execute()).rejects.toThrow(
        'Routine lifecycle floor was not loaded',
      );
      expect(repository.update).not.toHaveBeenCalled();
    },
  );
});

function createRoutine(
  isActive: boolean,
  revision: number,
  latestLifecycleEffectiveOn: string | null | typeof NOT_LOADED = null,
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
    latestLifecycleEffectiveOn:
      latestLifecycleEffectiveOn === NOT_LOADED
        ? undefined
        : latestLifecycleEffectiveOn
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
