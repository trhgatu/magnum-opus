import { ActivityFeed } from '../../../domain/activity-feed.entity';
import type { ActivityFeedRepository } from '../../../domain/ports/activity-feed.repository';
import type { Clock } from '../../ports/clock.port';
import { EnsureActivityFeedCommand } from '../ensure-activity-feed.command';
import { EnsureActivityFeedHandler } from './ensure-activity-feed.handler';

const NOW = new Date('2026-10-16T10:00:00.000Z');

describe('EnsureActivityFeedHandler', () => {
  const feeds: jest.Mocked<ActivityFeedRepository> = {
    findById: jest.fn(),
    findByResource: jest.fn(),
    insert: jest.fn(),
    saveSyncResult: jest.fn(),
  };
  const clock: Clock = { now: () => NOW };
  const handler = new EnsureActivityFeedHandler(feeds, clock);

  const resource = {
    ownerId: 'owner-id',
    provider: 'GITHUB' as const,
    externalAccountId: '127409189',
    externalResourceId: '1067270000',
  };
  const command = () =>
    new EnsureActivityFeedCommand({
      ...resource,
      displayName: 'trhgatu/magnum-opus',
    });

  const existing = () =>
    ActivityFeed.create({
      id: 'existing-feed',
      ...resource,
      displayName: 'trhgatu/magnum-opus',
      now: new Date('2026-09-01T00:00:00.000Z'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    feeds.insert.mockResolvedValue(true);
  });

  it('reuses the feed a resource already has — one feed, many projects', async () => {
    const feed = existing();
    feeds.findByResource.mockResolvedValue(feed);

    const result = await handler.execute(command());

    expect(feeds.findByResource).toHaveBeenCalledWith(resource);
    expect(result.getValue()).toBe(feed);
    expect(feeds.insert).not.toHaveBeenCalled();
  });

  it('creates an ACTIVE feed with nothing copied yet for a new resource', async () => {
    feeds.findByResource.mockResolvedValue(null);

    const result = await handler.execute(command());

    const created = feeds.insert.mock.calls[0][0];
    expect(result.getValue()).toBe(created);
    expect(created.toSnapshot()).toEqual({
      id: expect.any(String),
      ...resource,
      displayName: 'trhgatu/magnum-opus',
      coveredFrom: null,
      syncedUntil: null,
      lastSyncAt: null,
      status: 'ACTIVE',
      lastErrorCode: null,
      createdAt: NOW,
    });
  });

  it('uses the feed another request created first instead of a duplicate', async () => {
    const winner = existing();
    feeds.findByResource
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner);
    feeds.insert.mockResolvedValue(false);

    const result = await handler.execute(command());

    expect(result.getValue()).toBe(winner);
    expect(feeds.findByResource).toHaveBeenCalledTimes(2);
  });

  it('fails loudly if the feed vanished right after losing the race', async () => {
    feeds.findByResource.mockResolvedValue(null);
    feeds.insert.mockResolvedValue(false);

    await expect(handler.execute(command())).rejects.toThrow(
      'Activity feed disappeared',
    );
  });
});
