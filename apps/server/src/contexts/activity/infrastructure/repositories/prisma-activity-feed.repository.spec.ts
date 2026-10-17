import { Prisma } from '@repo/database';

import { ActivityFeed } from '../../domain/activity-feed.entity';
import { PrismaActivityFeedRepository } from './prisma-activity-feed.repository';

describe('PrismaActivityFeedRepository', () => {
  const activityFeed = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  };
  const prisma = {
    activityFeed,
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const repository = new PrismaActivityFeedRepository(prisma as never);

  const row = {
    id: 'feed-id',
    ownerId: 'owner-id',
    provider: 'GITHUB',
    externalAccountId: '127409189',
    externalResourceId: '1067270000',
    displayName: 'trhgatu/magnum-opus',
    coveredFrom: new Date('2026-09-24T00:00:00.000Z'),
    syncedUntil: new Date('2026-10-16T10:00:00.000Z'),
    lastSyncAt: new Date('2026-10-16T10:00:00.000Z'),
    status: 'ACTIVE',
    lastErrorCode: null,
    createdAt: new Date('2026-10-16T09:00:00.000Z'),
    updatedAt: new Date('2026-10-16T10:00:00.000Z'),
  };

  const resource = {
    ownerId: 'owner-id',
    provider: 'GITHUB' as const,
    externalAccountId: '127409189',
    externalResourceId: '1067270000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    activityFeed.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('findById', () => {
    it('reads a feed only within its owner', async () => {
      activityFeed.findFirst.mockResolvedValue(row);

      const feed = await repository.findById('owner-id', 'feed-id');

      expect(activityFeed.findFirst).toHaveBeenCalledWith({
        where: { id: 'feed-id', ownerId: 'owner-id' },
      });
      expect(feed?.toSnapshot()).toEqual({
        id: 'feed-id',
        ownerId: 'owner-id',
        provider: 'GITHUB',
        externalAccountId: '127409189',
        externalResourceId: '1067270000',
        displayName: 'trhgatu/magnum-opus',
        coveredFrom: row.coveredFrom,
        syncedUntil: row.syncedUntil,
        lastSyncAt: row.lastSyncAt,
        status: 'ACTIVE',
        lastErrorCode: null,
        createdAt: row.createdAt,
      });
    });

    it('returns null for a feed of another owner or none at all', async () => {
      activityFeed.findFirst.mockResolvedValue(null);

      await expect(repository.findById('owner-id', 'x')).resolves.toBeNull();
    });

    it('reads a stored error code back', async () => {
      activityFeed.findFirst.mockResolvedValue({
        ...row,
        status: 'DISCONNECTED',
        lastErrorCode: 'GITHUB_TOKEN_EXPIRED',
      });

      const feed = await repository.findById('owner-id', 'feed-id');

      expect(feed?.status).toBe('DISCONNECTED');
      expect(feed?.lastErrorCode).toBe('GITHUB_TOKEN_EXPIRED');
    });

    it('drops an error code it does not know rather than trusting it', async () => {
      activityFeed.findFirst.mockResolvedValue({
        ...row,
        status: 'ERROR',
        lastErrorCode: 'SOMETHING_OLD',
      });

      const feed = await repository.findById('owner-id', 'feed-id');

      expect(feed?.lastErrorCode).toBeNull();
    });
  });

  describe('findByResource', () => {
    it('finds the one feed of a resource for an account', async () => {
      activityFeed.findUnique.mockResolvedValue(row);

      const feed = await repository.findByResource(resource);

      expect(activityFeed.findUnique).toHaveBeenCalledWith({
        where: {
          ownerId_provider_externalAccountId_externalResourceId: resource,
        },
      });
      expect(feed?.id).toBe('feed-id');
    });
  });

  describe('insert', () => {
    const feed = () =>
      ActivityFeed.create({
        id: 'feed-id',
        ...resource,
        displayName: 'trhgatu/magnum-opus',
        now: new Date('2026-10-16T09:00:00.000Z'),
      });

    it('creates the feed', async () => {
      activityFeed.create.mockResolvedValue(row);

      await expect(repository.insert(feed())).resolves.toBe(true);

      expect(activityFeed.create).toHaveBeenCalledWith({
        data: {
          id: 'feed-id',
          ...resource,
          displayName: 'trhgatu/magnum-opus',
          coveredFrom: null,
          syncedUntil: null,
          lastSyncAt: null,
          status: 'ACTIVE',
          lastErrorCode: null,
          createdAt: new Date('2026-10-16T09:00:00.000Z'),
        },
      });
    });

    it('reports a feed another request created first', async () => {
      activityFeed.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(repository.insert(feed())).resolves.toBe(false);
    });

    it('lets other database errors surface', async () => {
      activityFeed.create.mockRejectedValue(new Error('connection lost'));

      await expect(repository.insert(feed())).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('saveSyncResult', () => {
    const now = new Date('2026-10-17T10:00:00.000Z');

    it('saves status and name, and moves each bound only outward', async () => {
      const feed = ActivityFeed.rehydrate({
        ...ActivityFeed.create({
          id: 'feed-id',
          ...resource,
          displayName: 'old-name',
          now,
        }).toSnapshot(),
        coveredFrom: new Date('2026-09-01T00:00:00.000Z'),
        syncedUntil: now,
      });
      feed.recordSuccess({
        window: { from: new Date('2026-10-15T10:00:00.000Z'), to: now },
        displayName: 'trhgatu/magnum-opus-renamed',
        now,
      });

      await repository.saveSyncResult(feed);

      expect(activityFeed.updateMany.mock.calls).toEqual([
        [
          {
            // Lần chép bắt đầu sớm hơn lần đã lưu không đè trạng thái.
            where: {
              id: 'feed-id',
              ownerId: 'owner-id',
              OR: [{ lastSyncAt: null }, { lastSyncAt: { lte: now } }],
            },
            data: {
              displayName: 'trhgatu/magnum-opus-renamed',
              status: 'ACTIVE',
              lastErrorCode: null,
              lastSyncAt: now,
            },
          },
        ],
        [
          {
            // coveredFrom chỉ lùi — hoặc bắt đầu lại sau một lỗ hổng.
            where: {
              id: 'feed-id',
              ownerId: 'owner-id',
              OR: [
                { coveredFrom: null },
                {
                  coveredFrom: {
                    gt: new Date('2026-09-01T00:00:00.000Z'),
                    lte: now,
                  },
                },
                {
                  syncedUntil: { lt: new Date('2026-09-01T00:00:00.000Z') },
                },
              ],
            },
            data: { coveredFrom: new Date('2026-09-01T00:00:00.000Z') },
          },
        ],
        [
          {
            // syncedUntil chỉ tiến: một lần chép cũ hơn không kéo nó lùi.
            where: {
              id: 'feed-id',
              ownerId: 'owner-id',
              OR: [{ syncedUntil: null }, { syncedUntil: { lt: now } }],
            },
            data: { syncedUntil: now },
          },
        ],
      ]);

      // Cả ba câu đi chung một transaction: không có chuyện trạng thái đã
      // lưu mà mốc thì chưa.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(
        activityFeed.updateMany.mock.results.map((result) => result.value),
      );
    });

    it('leaves the bounds alone for a feed that has never been copied', async () => {
      const feed = ActivityFeed.create({
        id: 'feed-id',
        ...resource,
        displayName: 'trhgatu/magnum-opus',
        now,
      });
      feed.recordFailure({ code: 'GITHUB_NOT_CONNECTED', now });

      await repository.saveSyncResult(feed);

      expect(activityFeed.updateMany).toHaveBeenCalledTimes(1);
      expect(activityFeed.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'feed-id',
          ownerId: 'owner-id',
          OR: [{ lastSyncAt: null }, { lastSyncAt: { lte: now } }],
        },
        data: {
          displayName: 'trhgatu/magnum-opus',
          status: 'DISCONNECTED',
          lastErrorCode: 'GITHUB_NOT_CONNECTED',
          lastSyncAt: now,
        },
      });
    });
  });
});
