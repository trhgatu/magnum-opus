import { Routine } from '../../../domain/routine.aggregate';
import { RoutineId } from '../../../domain/value-objects';
import { RoutineMutationService } from '../../services';
import { UpdateRoutineTitleCommand } from '../update-routine-title.command';
import { UpdateRoutineTitleHandler } from './update-routine-title.handler';

describe('UpdateRoutineTitleHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const mutationService = new RoutineMutationService(repository as never);

  const handler = new UpdateRoutineTitleHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('updates the title at the expected revision', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await handler.execute(
      new UpdateRoutineTitleCommand({
        routineId: 'routine-id',
        ownerId: 'owner-id',
        expectedRevision: 4,
        title: '  Evening ritual  ',
      }),
    );

    expect(result.getValue().title).toBe('Evening ritual');
    expect(result.getValue().revision).toBe(5);

    expect(repository.update).toHaveBeenCalledWith(routine, 4);
  });
});

function createRoutine(): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-id'],
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
