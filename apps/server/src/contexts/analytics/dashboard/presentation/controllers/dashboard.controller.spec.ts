import { Result } from '@shared/domain/result';

import { GetDashboardStatsQuery } from '../../application/queries';
import { DashboardController } from './dashboard.controller';

describe('DashboardController', () => {
  it('returns the unwrapped dashboard statistics', async () => {
    const stats = {
      totalUsers: 10,
      activeUsers: 7,
      inactiveUsers: 3,
      activeSessionsCount: 2,
      rolesDistribution: [{ role: 'USER', count: 10 }],
      userRegistrationTrend: [{ date: '2026-09-01', count: 1 }],
    };
    const queryBus = { execute: jest.fn().mockResolvedValue(Result.ok(stats)) };
    const controller = new DashboardController(queryBus as never);

    const response = await controller.getStats();

    expect(queryBus.execute).toHaveBeenCalledWith(new GetDashboardStatsQuery());
    expect(response).toEqual(stats);
  });
});
