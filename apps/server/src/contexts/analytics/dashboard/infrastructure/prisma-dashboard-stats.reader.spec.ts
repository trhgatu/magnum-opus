import type { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaDashboardStatsReader } from './prisma-dashboard-stats.reader';

describe('PrismaDashboardStatsReader', () => {
  const fixedNow = new Date('2026-09-03T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const dateKey = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return date.toISOString().split('T')[0];
  };

  const createPrisma = (options?: {
    totalUsers?: number;
    activeUsers?: number;
    roles?: { name: string; _count: { userRoles: number } }[];
    usersCreated?: { createdAt: Date }[];
  }) =>
    ({
      user: {
        count: jest
          .fn()
          .mockResolvedValueOnce(options?.totalUsers ?? 0)
          .mockResolvedValueOnce(options?.activeUsers ?? 0),
        findMany: jest.fn().mockResolvedValue(options?.usersCreated ?? []),
      },
      role: {
        findMany: jest.fn().mockResolvedValue(options?.roles ?? []),
      },
    }) as unknown as PrismaService;

  it('reports total and active user counts alongside role distribution', async () => {
    const prisma = createPrisma({
      totalUsers: 42,
      activeUsers: 30,
      roles: [
        { name: 'ADMIN', _count: { userRoles: 1 } },
        { name: 'USER', _count: { userRoles: 41 } },
      ],
    });
    const reader = new PrismaDashboardStatsReader(prisma);

    const stats = await reader.read();

    expect(stats.totalUsers).toBe(42);
    expect(stats.activeUsers).toBe(30);
    expect(stats.rolesDistribution).toEqual([
      { role: 'ADMIN', count: 1 },
      { role: 'USER', count: 41 },
    ]);
  });

  it('counts only non-deleted users created within the last 7 days', async () => {
    const prisma = createPrisma();
    const reader = new PrismaDashboardStatsReader(prisma);

    await reader.read();

    const expectedSevenDaysAgo = new Date();
    expectedSevenDaysAgo.setDate(expectedSevenDaysAgo.getDate() - 6);
    expectedSevenDaysAgo.setHours(0, 0, 0, 0);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { isDeleted: false, createdAt: { gte: expectedSevenDaysAgo } },
      select: { createdAt: true },
    });
  });

  it('buckets registrations into a sorted 7-day trend, defaulting empty days to zero', async () => {
    const prisma = createPrisma({
      usersCreated: [
        { createdAt: new Date(`${dateKey(0)}T09:00:00.000Z`) },
        { createdAt: new Date(`${dateKey(0)}T15:00:00.000Z`) },
        { createdAt: new Date(`${dateKey(3)}T00:00:00.000Z`) },
      ],
    });
    const reader = new PrismaDashboardStatsReader(prisma);

    const stats = await reader.read();

    expect(stats.userRegistrationTrend).toHaveLength(7);
    expect(stats.userRegistrationTrend).toEqual(
      expect.arrayContaining([
        { date: dateKey(0), count: 2 },
        { date: dateKey(1), count: 0 },
        { date: dateKey(3), count: 1 },
      ]),
    );
    const dates = stats.userRegistrationTrend.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort());
  });
});
