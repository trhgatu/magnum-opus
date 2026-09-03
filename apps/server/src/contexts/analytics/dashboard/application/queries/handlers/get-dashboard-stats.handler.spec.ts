import type { ICachePort } from '@shared/application/ports/cache.port';

import type { DashboardStatsReader } from '../../ports/dashboard-stats-reader.port';
import {
  GetDashboardStatsException,
  GetDashboardStatsQueryHandler,
} from './get-dashboard-stats.handler';

describe('GetDashboardStatsQueryHandler', () => {
  const createHandler = (options?: {
    databaseStats?: Awaited<ReturnType<DashboardStatsReader['read']>>;
    sessionKeys?: string[];
    readError?: unknown;
  }) => {
    const statsReader = {
      read: options?.readError
        ? jest.fn().mockRejectedValue(options.readError)
        : jest.fn().mockResolvedValue(
            options?.databaseStats ?? {
              totalUsers: 10,
              activeUsers: 7,
              rolesDistribution: [{ role: 'USER', count: 10 }],
              userRegistrationTrend: [{ date: '2026-09-01', count: 2 }],
            },
          ),
    } as unknown as jest.Mocked<DashboardStatsReader>;
    const cache = {
      scan: jest.fn().mockResolvedValue(options?.sessionKeys ?? []),
    } as unknown as jest.Mocked<ICachePort>;

    return {
      handler: new GetDashboardStatsQueryHandler(statsReader, cache),
      statsReader,
      cache,
    };
  };

  it('derives inactive users and active session count from the readers', async () => {
    const { handler, cache } = createHandler({
      databaseStats: {
        totalUsers: 10,
        activeUsers: 7,
        rolesDistribution: [{ role: 'ADMIN', count: 1 }],
        userRegistrationTrend: [{ date: '2026-09-01', count: 2 }],
      },
      sessionKeys: ['refresh_token:a', 'refresh_token:b', 'refresh_token:c'],
    });

    const result = await handler.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      totalUsers: 10,
      activeUsers: 7,
      inactiveUsers: 3,
      activeSessionsCount: 3,
      rolesDistribution: [{ role: 'ADMIN', count: 1 }],
      userRegistrationTrend: [{ date: '2026-09-01', count: 2 }],
    });
    expect(cache.scan).toHaveBeenCalledWith('refresh_token:*');
  });

  it('wraps a reader failure into a domain exception with its message', async () => {
    const { handler } = createHandler({
      readError: new Error('DB unreachable'),
    });

    const result = await handler.execute();

    expect(result.isFailure).toBe(true);
    const error = result.getError();
    expect(error).toBeInstanceOf(GetDashboardStatsException);
    expect(error.message).toBe('DB unreachable');
  });

  it('falls back to a generic message when a non-Error value is thrown', async () => {
    const { handler } = createHandler({ readError: 'boom' });

    const result = await handler.execute();

    expect(result.getError().message).toBe(
      'Failed to aggregate dashboard statistics',
    );
  });
});
