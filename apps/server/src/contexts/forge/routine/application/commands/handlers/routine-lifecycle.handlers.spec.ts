import { Routine } from '../../../domain/routine.aggregate';
import { RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService } from '../../services';
import { ArchiveRoutineCommand } from '../archive-routine.command';
import { RestoreRoutineCommand } from '../restore-routine.command';
import { ArchiveRoutineHandler } from './archive-routine.handler';
import { RestoreRoutineHandler } from './restore-routine.handler';

describe('Routine lifecycle command handlers', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const mutationService = new RoutineMutationService(repository as never);

  const archiveHandler = new ArchiveRoutineHandler(mutationService);

  const restoreHandler = new RestoreRoutineHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('archives an active Routine', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine(true, 1));

    const result = await archiveHandler.execute(
      new ArchiveRoutineCommand('routine-id', 'owner-id', 1),
    );

    expect(result.getValue().isActive).toBe(false);
    expect(result.getValue().revision).toBe(2);
  });

  it('restores an archived Routine', async () => {
    repository.findByIdForOwner.mockResolvedValue(createRoutine(false, 4));

    const result = await restoreHandler.execute(
      new RestoreRoutineCommand('routine-id', 'owner-id', 4),
    );

    expect(result.getValue().isActive).toBe(true);
    expect(result.getValue().revision).toBe(5);
  });
});

function createRoutine(isActive: boolean, revision: number): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-id'],
    isActive,
    revision,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
