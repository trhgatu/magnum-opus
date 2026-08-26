import { CreateRoutineCommand } from '../create-routine.command';
import { CreateRoutineHandler } from './create-routine.handler';

describe('CreateRoutineHandler', () => {
  const repository = {
    create: jest.fn(),
  };

  const handler = new CreateRoutineHandler(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockResolvedValue(undefined);
  });

  it('creates and persists an empty private Routine', async () => {
    const result = await handler.execute(
      new CreateRoutineCommand({
        ownerId: 'owner-id',
        title: '  Morning ritual  ',
      }),
    );

    const routine = result.getValue();

    expect(routine.ownerId).toBe('owner-id');
    expect(routine.title).toBe('Morning ritual');
    expect(routine.habitIds).toEqual([]);
    expect(routine.isActive).toBe(true);
    expect(routine.revision).toBe(1);

    expect(repository.create).toHaveBeenCalledWith(routine);
  });
});
