import type { LedgerFeed } from '@activity/application/ports/activity-ledger-reader.port';
import { ActivitySourceError } from '@shared/application/activity';

import { ActivitySourceUnavailableException } from '../../../domain/exceptions';
import type { ProjectActivitySourceLink } from '../../../domain/ports/project-activity-source.repository';
import { LinkActivitySourceCommand } from '..';
import { LinkActivitySourceHandler } from './link-activity-source.handler';

const NOW = new Date('2026-10-16T10:00:00.000Z');
const CYCLE_START = new Date('2026-10-01T09:00:00.000Z');

describe('LinkActivitySourceHandler', () => {
  const declarations = { read: jest.fn(), exists: jest.fn() };
  const sources = {
    listByProject: jest.fn(),
    findOne: jest.fn(),
    link: jest.fn(),
    unlink: jest.fn(),
  };
  const feeds = { ensureFeed: jest.fn() };
  const sync = { syncFeed: jest.fn() };
  const ledger = { listFeeds: jest.fn(), listEvents: jest.fn() };
  const handler = new LinkActivitySourceHandler(
    declarations,
    sources,
    feeds as never,
    sync as never,
    ledger,
    { now: () => NOW },
  );

  const link: ProjectActivitySourceLink = {
    projectId: 'project-id',
    feedId: 'feed-id',
    ownerId: 'owner-id',
    linkedAt: NOW,
  };
  const feed: LedgerFeed = {
    feedId: 'feed-id',
    provider: 'GITHUB',
    externalResourceId: '1067270000',
    displayName: 'trhgatu/magnum-opus',
    status: 'ACTIVE',
    lastErrorCode: null,
    coveredFrom: new Date('2026-09-24T09:00:00.000Z'),
    syncedUntil: NOW,
    lastSyncAt: NOW,
  };

  const command = () =>
    new LinkActivitySourceCommand({
      ownerId: 'owner-id',
      projectId: 'project-id',
      provider: 'GITHUB',
      externalResourceId: '1067270000',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    declarations.read.mockResolvedValue({
      projectId: 'project-id',
      transitions: [
        {
          fromState: 'NOT_STARTED',
          toState: 'ACTIVE',
          occurredAt: CYCLE_START,
          cycleId: 'cycle-1',
        },
      ],
      cycles: [{ id: 'cycle-1', cycleNumber: 1, startedAt: CYCLE_START }],
    });
    feeds.ensureFeed.mockResolvedValue('feed-id');
    sources.link.mockResolvedValue(true);
    sources.findOne.mockResolvedValue(link);
    sync.syncFeed.mockResolvedValue(null);
    ledger.listFeeds.mockResolvedValue([feed]);
  });

  it('links the feed and copies back to when the open cycle started', async () => {
    const result = await handler.execute(command());

    expect(feeds.ensureFeed).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      provider: 'GITHUB',
      externalResourceId: '1067270000',
    });
    expect(sources.link).toHaveBeenCalledWith(link);
    expect(sync.syncFeed).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      feedId: 'feed-id',
      neededFrom: CYCLE_START,
    });
    expect(result.getValue()).toEqual({
      source: { ...feed, linkedAt: NOW },
      created: true,
    });
  });

  it('answers an already linked source without linking or copying again', async () => {
    const earlier = { ...link, linkedAt: new Date('2026-10-05T00:00:00Z') };
    sources.link.mockResolvedValue(false);
    sources.findOne.mockResolvedValue(earlier);

    const result = await handler.execute(command());

    expect(sync.syncFeed).not.toHaveBeenCalled();
    expect(result.getValue()).toEqual({
      source: { ...feed, linkedAt: earlier.linkedAt },
      created: false,
    });
  });

  it('still links when the first copy fails', async () => {
    sync.syncFeed.mockRejectedValue(new Error('database hiccup'));

    const result = await handler.execute(command());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().created).toBe(true);
  });

  it('refuses a project the owner does not have', async () => {
    declarations.read.mockResolvedValue(null);

    const result = await handler.execute(command());

    expect(result.getError().error.code).toBe('PROJECT_NOT_FOUND');
    expect(feeds.ensureFeed).not.toHaveBeenCalled();
  });

  it.each([
    ['GITHUB_NOT_CONNECTED', 'GITHUB_NOT_CONNECTED'],
    ['GITHUB_TOKEN_EXPIRED', 'GITHUB_NOT_CONNECTED'],
    ['GITHUB_TOKEN_REVOKED', 'GITHUB_NOT_CONNECTED'],
    ['GITHUB_REPOSITORY_NOT_ACCESSIBLE', 'GITHUB_REPOSITORY_NOT_ACCESSIBLE'],
    ['GITHUB_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
  ] as const)(
    'maps %s from the source to the API error %s, linking nothing',
    async (sourceCode, apiCode) => {
      feeds.ensureFeed.mockRejectedValue(new ActivitySourceError(sourceCode));

      const result = await handler.execute(command());

      expect(result.getError()).toBeInstanceOf(
        ActivitySourceUnavailableException,
      );
      expect(result.getError().error.code).toBe(apiCode);
      expect(sources.link).not.toHaveBeenCalled();
    },
  );

  it('passes the seconds to wait on a rate limit', async () => {
    feeds.ensureFeed.mockRejectedValue(
      new ActivitySourceError('GITHUB_RATE_LIMITED', 120),
    );

    const result = await handler.execute(command());

    expect(result.getError().error.code).toBe('GITHUB_RATE_LIMITED');
    expect(result.getError().args).toEqual({ retryAfter: 120 });
  });

  it('lets unexpected errors surface', async () => {
    feeds.ensureFeed.mockRejectedValue(new Error('boom'));

    await expect(handler.execute(command())).rejects.toThrow('boom');
  });
});
