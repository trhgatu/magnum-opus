import { TodayReadModel } from '../../ports/today-reader.port';
import { GetTodayQuery } from '../get-today.query';
import { GetTodayHandler } from './get-today.handler';

describe('GetTodayHandler', () => {
  const instant = new Date('2026-08-30T17:30:00.000Z');

  const clock = {
    now: jest.fn(),
  };

  const reader = {
    findForOwnerAt: jest.fn(),
  };

  const handler = new GetTodayHandler(clock as never, reader as never);

  beforeEach(() => {
    jest.clearAllMocks();
    clock.now.mockReturnValue(instant);
  });

  it('loads Today for the authenticated owner at one fixed instant', async () => {
    const today = createTodayReadModel();

    reader.findForOwnerAt.mockResolvedValue(today);

    const result = await handler.execute(new GetTodayQuery('owner-id'));

    expect(clock.now).toHaveBeenCalledTimes(1);
    expect(reader.findForOwnerAt).toHaveBeenCalledWith('owner-id', instant);
    expect(result.getValue()).toBe(today);
  });

  it('preserves an empty Today read model', async () => {
    const today: TodayReadModel = {
      date: '2026-08-31',
      timeZone: 'Asia/Bangkok',
      emptyReason: 'NOTHING_DUE',
      routines: [],
      standaloneHabits: [],
    };

    reader.findForOwnerAt.mockResolvedValue(today);

    const result = await handler.execute(new GetTodayQuery('owner-id'));

    expect(result.getValue()).toBe(today);
  });
});

function createTodayReadModel(): TodayReadModel {
  const sharedHabit = {
    id: 'habit-id',
    title: 'Drink water',
    description: null,
    checkedIn: false,
  };

  return {
    date: '2026-08-31',
    timeZone: 'Asia/Bangkok',
    emptyReason: null,
    routines: [
      {
        id: 'morning-routine-id',
        title: 'Morning ritual',
        habits: [sharedHabit],
      },
      {
        id: 'health-routine-id',
        title: 'Health',
        habits: [sharedHabit],
      },
    ],
    standaloneHabits: [],
  };
}
