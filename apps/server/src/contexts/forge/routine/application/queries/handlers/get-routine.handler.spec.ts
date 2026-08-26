import { RoutineNotFoundException } from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import { RoutineId } from '../../../domain/value-objects';
import { GetRoutineQuery } from '../get-routine.query';
import { GetRoutineHandler } from './get-routine.handler';

describe('GetRoutineHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
  };

  const handler = new GetRoutineHandler(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a Routine owned by the requesting user', async () => {
    const routine = createRoutine();
    repository.findByIdForOwner.mockResolvedValue(routine);

    const result = await handler.execute(
      new GetRoutineQuery('routine-id', 'owner-id'),
    );

    expect(repository.findByIdForOwner).toHaveBeenCalledWith(
      'routine-id',
      'owner-id',
    );

    expect(result.getValue()).toBe(routine);
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetRoutineQuery('routine-id', 'different-owner'),
    );

    expect(result.getError()).toBeInstanceOf(RoutineNotFoundException);
  });
});

function createRoutine(): Routine {
  return Routine.rehydrate({
    id: new RoutineId('routine-id'),
    ownerId: 'owner-id',
    title: 'Morning ritual',
    habitIds: ['habit-first', 'habit-second'],
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  });
}
