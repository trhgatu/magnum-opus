import { RoutineNotFoundException } from '../../../domain/exceptions';
import { RoutineDetailReadModel } from '../../ports/routine-reader.port';
import { GetRoutineQuery } from '../get-routine.query';
import { GetRoutineHandler } from './get-routine.handler';

describe('GetRoutineHandler', () => {
  const reader = {
    findByIdForOwner: jest.fn(),
  };

  const handler = new GetRoutineHandler(reader as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the owned Routine detail read model', async () => {
    const detail = createDetail();
    reader.findByIdForOwner.mockResolvedValue(detail);

    const result = await handler.execute(
      new GetRoutineQuery('routine-id', 'owner-id'),
    );

    expect(reader.findByIdForOwner).toHaveBeenCalledWith(
      'routine-id',
      'owner-id',
    );
    expect(result.getValue()).toBe(detail);
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    reader.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetRoutineQuery('routine-id', 'different-owner'),
    );

    expect(result.getError()).toBeInstanceOf(RoutineNotFoundException);
  });
});

function createDetail(): RoutineDetailReadModel {
  return {
    id: 'routine-id',
    title: 'Morning ritual',
    isActive: true,
    revision: 4,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
    habits: [
      {
        id: 'habit-first',
        title: 'Drink water',
        isActive: true,
        order: 1,
      },
      {
        id: 'habit-second',
        title: 'Read',
        isActive: false,
        order: 2,
      },
    ],
  };
}
