import { RoutineTodayService } from '../../services';
import { CreateRoutineCommand } from '../create-routine.command';
import { CreateRoutineHandler } from './create-routine.handler';

describe('CreateRoutineHandler', () => {
  const repository = {
    create: jest.fn(),
  };
  const timeZoneReader = { getForUser: jest.fn() };
  const clock = { now: jest.fn() };

  const handler = new CreateRoutineHandler(
    repository as never,
    new RoutineTodayService(timeZoneReader, clock),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockResolvedValue(undefined);
    // 18:00 UTC ngày 08 = 01:00 ngày 09 ở Asia/Ho_Chi_Minh.
    clock.now.mockReturnValue(new Date('2026-10-08T18:00:00.000Z'));
    timeZoneReader.getForUser.mockResolvedValue('Asia/Ho_Chi_Minh');
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

  it("stamps createdOn with the owner's calendar date", async () => {
    const result = await handler.execute(
      new CreateRoutineCommand({
        ownerId: 'owner-id',
        title: 'Morning ritual',
      }),
    );

    expect(timeZoneReader.getForUser).toHaveBeenCalledWith('owner-id');
    expect(result.getValue().createdOn.value).toBe('2026-10-09');
    expect(result.getValue().getDomainEvents()).toEqual([]);
  });
});
