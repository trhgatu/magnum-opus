import { Result } from '@shared/domain/result';

import type { MonthlyChronicleReadModel } from '../../application/queries';
import { GetMonthlyChronicleQuery } from '../../application/queries';
import { ChronicleMonthInFutureException } from '../../domain/exceptions';

import { ChronicleController } from './chronicle.controller';

describe('ChronicleController', () => {
  const queryBus = { execute: jest.fn() };
  const controller = new ChronicleController(queryBus as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the monthly Chronicle of the authenticated owner', async () => {
    queryBus.execute.mockResolvedValue(Result.ok(createReadModel()));

    const response = await controller.getMonthly('owner-id', 2026, 8);

    const query = queryBus.execute.mock.calls[0]?.[0];
    expect(query).toBeInstanceOf(GetMonthlyChronicleQuery);
    expect(query).toMatchObject({ ownerId: 'owner-id', year: 2026, month: 8 });

    expect(response).toMatchObject({
      year: 2026,
      month: 8,
      computedAt: '2026-09-01T02:00:00.000Z',
      journal: { entryCount: 12 },
    });
    expect(response).not.toHaveProperty('ownerId');
    expect(response).not.toHaveProperty('sections');
  });

  it('surfaces a domain failure as the thrown domain exception', async () => {
    queryBus.execute.mockResolvedValue(
      Result.fail(new ChronicleMonthInFutureException(2026, 10)),
    );

    await expect(controller.getMonthly('owner-id', 2026, 10)).rejects.toThrow(
      ChronicleMonthInFutureException,
    );
  });
});

function createReadModel(): MonthlyChronicleReadModel {
  return {
    year: 2026,
    month: 8,
    computedAt: new Date('2026-09-01T02:00:00.000Z'),
    sections: {
      habit: {
        buildCompletionRate: 0,
        bestStreak: null,
        mostConsistentHabit: null,
        quitHabits: [],
      },
      routine: { completionRate: 0 },
      project: { activeCount: 0, completedCount: 0, stoppedCount: 0 },
      journal: { entryCount: 12 },
      mood: { dominantMood: null, distribution: {} },
      memory: { memoryCount: 0 },
    },
  };
}
