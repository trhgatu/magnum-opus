import { PrismaActivityLedgerReader } from './prisma-activity-ledger.reader';

describe('PrismaActivityLedgerReader', () => {
  const activityEvent = { findMany: jest.fn() };
  const activityFeed = { findMany: jest.fn() };
  const reader = new PrismaActivityLedgerReader({
    activityEvent,
    activityFeed,
  } as never);

  const from = new Date('2026-10-01T00:00:00.000Z');
  const to = new Date('2026-10-16T00:00:00.000Z');

  beforeEach(() => jest.clearAllMocks());

  describe('listEvents', () => {
    it('reads events of the owner’s feeds inside [from, to), oldest first', async () => {
      const rows = [
        {
          feedId: 'feed-1',
          kind: 'COMMIT_AUTHORED',
          occurredAt: new Date('2026-10-05T04:38:41.000Z'),
          quantity: 1,
        },
      ];
      activityEvent.findMany.mockResolvedValue(rows);

      const events = await reader.listEvents({
        ownerId: 'owner-id',
        feedIds: ['feed-1', 'feed-2'],
        from,
        to,
      });

      expect(events).toEqual(rows);
      expect(activityEvent.findMany).toHaveBeenCalledWith({
        where: {
          feedId: { in: ['feed-1', 'feed-2'] },
          feed: { ownerId: 'owner-id' },
          occurredAt: { gte: from, lt: to },
        },
        // Không bao giờ đọc dedupeKey ra ngoài sổ.
        select: { feedId: true, kind: true, occurredAt: true, quantity: true },
        orderBy: { occurredAt: 'asc' },
      });
    });

    it('does not query for no feeds', async () => {
      await expect(
        reader.listEvents({ ownerId: 'owner-id', feedIds: [], from, to }),
      ).resolves.toEqual([]);
      expect(activityEvent.findMany).not.toHaveBeenCalled();
    });
  });

  describe('listFeeds', () => {
    const row = {
      id: 'feed-1',
      ownerId: 'owner-id',
      provider: 'GITHUB',
      externalAccountId: '127409189',
      externalResourceId: '1067270000',
      displayName: 'trhgatu/magnum-opus',
      coveredFrom: from,
      syncedUntil: to,
      lastSyncAt: to,
      status: 'DISCONNECTED',
      lastErrorCode: 'GITHUB_TOKEN_EXPIRED',
      createdAt: from,
      updatedAt: to,
    };

    it('reads the coverage and state of the owner’s feeds', async () => {
      activityFeed.findMany.mockResolvedValue([row]);

      const feeds = await reader.listFeeds({
        ownerId: 'owner-id',
        feedIds: ['feed-1'],
      });

      expect(activityFeed.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['feed-1'] }, ownerId: 'owner-id' },
      });
      expect(feeds).toEqual([
        {
          feedId: 'feed-1',
          provider: 'GITHUB',
          externalAccountId: '127409189',
          externalResourceId: '1067270000',
          displayName: 'trhgatu/magnum-opus',
          status: 'DISCONNECTED',
          lastErrorCode: 'GITHUB_TOKEN_EXPIRED',
          coveredFrom: from,
          syncedUntil: to,
          lastSyncAt: to,
        },
      ]);
    });

    it('does not query for no feeds', async () => {
      await expect(
        reader.listFeeds({ ownerId: 'owner-id', feedIds: [] }),
      ).resolves.toEqual([]);
      expect(activityFeed.findMany).not.toHaveBeenCalled();
    });
  });
});
