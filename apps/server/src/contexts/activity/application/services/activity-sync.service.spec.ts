import {
  type ActivityProviderPort,
  ActivitySourceError,
} from '@shared/application/activity';

import { ActivityFeed } from '../../domain/activity-feed.entity';
import type { ActivityFeedRepository } from '../../domain/ports/activity-feed.repository';
import type { ActivityEventWriter } from '../ports/activity-event-writer.port';
import type { Clock } from '../ports/clock.port';
import { ActivitySyncService } from './activity-sync.service';

const NOW = new Date('2026-10-16T10:00:00.000Z');
const NEEDED_FROM = new Date('2026-10-01T00:00:00.000Z');
const DAY_MS = 86_400_000;

describe('ActivitySyncService', () => {
  const feeds: jest.Mocked<ActivityFeedRepository> = {
    findById: jest.fn(),
    findByResource: jest.fn(),
    insert: jest.fn(),
    saveSyncResult: jest.fn(),
  };
  const writer: jest.Mocked<ActivityEventWriter> = { append: jest.fn() };
  const github: jest.Mocked<ActivityProviderPort> = {
    provider: 'GITHUB',
    capabilities: { historyWindowDays: null },
    fetchEvents: jest.fn(),
  };
  const clock: Clock = { now: () => NOW };
  const service = new ActivitySyncService(feeds, writer, [github], clock);

  const newFeed = () =>
    ActivityFeed.create({
      id: 'feed-id',
      ownerId: 'owner-id',
      provider: 'GITHUB',
      externalAccountId: '127409189',
      externalResourceId: '1067270000',
      displayName: 'trhgatu/magnum-opus',
      now: new Date('2026-10-16T09:00:00.000Z'),
    });

  const event = {
    kind: 'COMMIT_AUTHORED' as const,
    occurredAt: new Date('2026-10-05T04:38:41.000Z'),
    quantity: 1,
    dedupeKey: 'abc',
  };

  const sync = () =>
    service.syncFeed({
      ownerId: 'owner-id',
      feedId: 'feed-id',
      neededFrom: NEEDED_FROM,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    feeds.findById.mockResolvedValue(newFeed());
    github.fetchEvents.mockResolvedValue({
      displayName: 'trhgatu/magnum-opus-renamed',
      events: [event],
    });
    writer.append.mockResolvedValue(1);
  });

  it('copies the planned window into the ledger and saves the feed', async () => {
    const feed = await sync();

    // Lần chép đầu: lùi 7 ngày trước mốc cần.
    const from = new Date(NEEDED_FROM.getTime() - 7 * DAY_MS);
    expect(feeds.findById).toHaveBeenCalledWith('owner-id', 'feed-id');
    expect(github.fetchEvents).toHaveBeenCalledWith(
      {
        ownerId: 'owner-id',
        externalAccountId: '127409189',
        externalResourceId: '1067270000',
      },
      from,
      NOW,
    );
    expect(writer.append).toHaveBeenCalledWith('feed-id', [event]);
    expect(feeds.saveSyncResult).toHaveBeenCalledWith(feed);
    expect(feed?.toSnapshot()).toMatchObject({
      coveredFrom: from,
      syncedUntil: NOW,
      lastSyncAt: NOW,
      displayName: 'trhgatu/magnum-opus-renamed',
      status: 'ACTIVE',
    });
  });

  it('writes the ledger before moving the bounds', async () => {
    const order: string[] = [];
    writer.append.mockImplementation(async () => {
      order.push('append');
      return 1;
    });
    feeds.saveSyncResult.mockImplementation(async () => {
      order.push('save');
    });

    await sync();

    // Ngược lại thì một lỗi giữa chừng để lại mốc đã tiến mà sổ thiếu event.
    expect(order).toEqual(['append', 'save']);
  });

  it('does not call the source while the feed is fresh', async () => {
    const fresh = newFeed();
    fresh.recordSuccess({
      window: { from: NEEDED_FROM, to: NOW },
      displayName: 'trhgatu/magnum-opus',
      now: new Date(NOW.getTime() - 60_000),
    });
    feeds.findById.mockResolvedValue(fresh);

    const feed = await sync();

    expect(feed).toBe(fresh);
    expect(github.fetchEvents).not.toHaveBeenCalled();
    expect(feeds.saveSyncResult).not.toHaveBeenCalled();
  });

  it('records a source failure on the feed and keeps the ledger as it is', async () => {
    github.fetchEvents.mockRejectedValue(
      new ActivitySourceError('GITHUB_TOKEN_EXPIRED'),
    );

    const feed = await sync();

    expect(writer.append).not.toHaveBeenCalled();
    expect(feeds.saveSyncResult).toHaveBeenCalledWith(feed);
    expect(feed?.toSnapshot()).toMatchObject({
      status: 'DISCONNECTED',
      lastErrorCode: 'GITHUB_TOKEN_EXPIRED',
      lastSyncAt: NOW,
      coveredFrom: null,
      syncedUntil: null,
    });
  });

  it('returns null for a feed the owner does not have', async () => {
    feeds.findById.mockResolvedValue(null);

    await expect(sync()).resolves.toBeNull();
    expect(github.fetchEvents).not.toHaveBeenCalled();
  });

  it('lets unexpected errors surface without saving a half-done copy', async () => {
    writer.append.mockRejectedValue(new Error('database down'));

    await expect(sync()).rejects.toThrow('database down');
    expect(feeds.saveSyncResult).not.toHaveBeenCalled();
  });

  it('fails loudly when no provider is registered for the feed', async () => {
    const bare = new ActivitySyncService(feeds, writer, [], clock);

    await expect(
      bare.syncFeed({
        ownerId: 'owner-id',
        feedId: 'feed-id',
        neededFrom: NEEDED_FROM,
      }),
    ).rejects.toThrow('No activity provider registered for GITHUB');
  });
});
