import { Result } from '@shared/domain/result';

import type { TodayReadModel } from '../../application/ports/today-reader.port';
import { GetTodayQuery } from '../../application/queries';
import { TodayController } from './today.controller';

describe('TodayController', () => {
  const queryBus = {
    execute: jest.fn(),
  };

  const controller = new TodayController(queryBus as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads Today for the authenticated owner', async () => {
    queryBus.execute.mockResolvedValue(Result.ok(createTodayReadModel()));

    const response = await controller.getToday('owner-id');

    const query = queryBus.execute.mock.calls[0]?.[0];

    expect(query).toBeInstanceOf(GetTodayQuery);
    expect(query).toMatchObject({
      ownerId: 'owner-id',
    });

    expect(response).toEqual({
      date: '2026-08-31',
      timeZone: 'Asia/Bangkok',
      emptyReason: null,
      routines: [
        {
          id: 'routine-id',
          title: 'Morning ritual',
          habits: [
            {
              id: 'habit-id',
              title: 'Drink water',
              description: null,
              checkedIn: true,
            },
          ],
        },
      ],
      standaloneHabits: [],
    });

    expect(response).not.toHaveProperty('ownerId');
  });
});

function createTodayReadModel(): TodayReadModel {
  return {
    date: '2026-08-31',
    timeZone: 'Asia/Bangkok',
    emptyReason: null,
    routines: [
      {
        id: 'routine-id',
        title: 'Morning ritual',
        habits: [
          {
            id: 'habit-id',
            title: 'Drink water',
            description: null,
            checkedIn: true,
          },
        ],
      },
    ],
    standaloneHabits: [],
  };
}
