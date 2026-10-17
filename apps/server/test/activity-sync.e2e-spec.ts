import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import {
  ACTIVITY_LEDGER_READER,
  type ActivityLedgerReader,
} from '../src/contexts/activity/application/ports/activity-ledger-reader.port';
import { ActivitySyncService } from '../src/contexts/activity/application/services/activity-sync.service';
import { ActivityFeed } from '../src/contexts/activity/domain/activity-feed.entity';
import {
  ACTIVITY_FEED_REPOSITORY,
  type ActivityFeedRepository,
} from '../src/contexts/activity/domain/ports/activity-feed.repository';
import { GITHUB_ACTIVITY_PROVIDER } from '../src/contexts/integrations/github/application/ports/github-activity-provider.port';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  type ActivityProviderPort,
  ActivitySourceError,
} from '../src/shared/application/activity';

// Cả chuỗi chép trên DB thật, với một provider giả thay cho GitHub.
describe('Activity sync (E2E, database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let feeds: ActivityFeedRepository;
  let sync: ActivitySyncService;
  let ledger: ActivityLedgerReader;
  let ownerId: string;

  const provider: jest.Mocked<ActivityProviderPort> = {
    provider: 'GITHUB',
    capabilities: { historyWindowDays: null },
    fetchEvents: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GITHUB_ACTIVITY_PROVIDER)
      .useValue(provider)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    feeds = app.get(ACTIVITY_FEED_REPOSITORY);
    sync = app.get(ActivitySyncService);
    ledger = app.get(ACTIVITY_LEDGER_READER);
    ownerId = await registerOwner();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const createFeed = async (externalResourceId: string) => {
    const feed = ActivityFeed.create({
      id: crypto.randomUUID(),
      ownerId,
      provider: 'GITHUB',
      externalAccountId: '127409189',
      externalResourceId,
      displayName: 'trhgatu/magnum-opus',
      now: new Date(),
    });
    await feeds.insert(feed);
    return feed;
  };

  const neededFrom = new Date('2026-10-01T00:00:00.000Z');
  const commit = {
    kind: 'COMMIT_AUTHORED' as const,
    occurredAt: new Date('2026-10-05T04:38:41.000Z'),
    quantity: 1,
    dedupeKey: 'b'.repeat(64),
  };

  it('copies events into the ledger and records how far it covers', async () => {
    const feed = await createFeed('2001');
    provider.fetchEvents.mockResolvedValue({
      displayName: 'trhgatu/magnum-opus-renamed',
      events: [commit],
    });

    await sync.syncFeed({ ownerId, feedId: feed.id, neededFrom });

    const [stored] = await ledger.listFeeds({ ownerId, feedIds: [feed.id] });
    expect(stored).toMatchObject({
      displayName: 'trhgatu/magnum-opus-renamed',
      status: 'ACTIVE',
      lastErrorCode: null,
    });
    expect(stored.coveredFrom!.getTime()).toBeLessThan(neededFrom.getTime());
    expect(stored.syncedUntil).not.toBeNull();

    await expect(
      ledger.listEvents({
        ownerId,
        feedIds: [feed.id],
        from: neededFrom,
        to: new Date('2026-10-16T00:00:00.000Z'),
      }),
    ).resolves.toEqual([
      {
        feedId: feed.id,
        kind: 'COMMIT_AUTHORED',
        occurredAt: commit.occurredAt,
        quantity: 1,
      },
    ]);
  });

  it('does not ask the source again while the feed is fresh', async () => {
    const feed = await createFeed('2002');
    provider.fetchEvents.mockResolvedValue({
      displayName: 'trhgatu/magnum-opus',
      events: [commit],
    });

    await sync.syncFeed({ ownerId, feedId: feed.id, neededFrom });
    await sync.syncFeed({ ownerId, feedId: feed.id, neededFrom });

    expect(provider.fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('records a source failure on the feed and keeps the ledger it has', async () => {
    const feed = await createFeed('2003');
    provider.fetchEvents.mockResolvedValueOnce({
      displayName: 'trhgatu/magnum-opus',
      events: [commit],
    });
    await sync.syncFeed({ ownerId, feedId: feed.id, neededFrom });
    const [before] = await ledger.listFeeds({ ownerId, feedIds: [feed.id] });

    // Cho feed cũ đi để lần chép sau thật sự gọi nguồn — và lần này lỗi.
    await prisma.activityFeed.update({
      where: { id: feed.id },
      data: { lastSyncAt: new Date(Date.now() - 60 * 60_000) },
    });
    provider.fetchEvents.mockRejectedValueOnce(
      new ActivitySourceError('GITHUB_TOKEN_REVOKED'),
    );
    await sync.syncFeed({ ownerId, feedId: feed.id, neededFrom });

    expect(provider.fetchEvents).toHaveBeenCalledTimes(2);
    const [after] = await ledger.listFeeds({ ownerId, feedIds: [feed.id] });
    expect(after).toMatchObject({
      status: 'DISCONNECTED',
      lastErrorCode: 'GITHUB_TOKEN_REVOKED',
      coveredFrom: before.coveredFrom,
      syncedUntil: before.syncedUntil,
    });
    await expect(
      ledger.listEvents({
        ownerId,
        feedIds: [feed.id],
        from: neededFrom,
        to: new Date('2026-10-16T00:00:00.000Z'),
      }),
    ).resolves.toEqual([
      {
        feedId: feed.id,
        kind: 'COMMIT_AUTHORED',
        occurredAt: commit.occurredAt,
        quantity: 1,
      },
    ]);
  });

  it('shows another owner nothing of the ledger', async () => {
    const feed = await createFeed('2004');
    provider.fetchEvents.mockResolvedValue({
      displayName: 'trhgatu/magnum-opus',
      events: [commit],
    });
    await sync.syncFeed({ ownerId, feedId: feed.id, neededFrom });

    await expect(
      sync.syncFeed({ ownerId: 'someone-else', feedId: feed.id, neededFrom }),
    ).resolves.toBeNull();
    await expect(
      ledger.listFeeds({ ownerId: 'someone-else', feedIds: [feed.id] }),
    ).resolves.toEqual([]);
    await expect(
      ledger.listEvents({
        ownerId: 'someone-else',
        feedIds: [feed.id],
        from: neededFrom,
        to: new Date('2026-10-16T00:00:00.000Z'),
      }),
    ).resolves.toEqual([]);
  });

  async function registerOwner(): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `activity.sync.${suffix}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `sync_${suffix}`.slice(0, 50),
        password: 'activity-password-123',
      })
      .expect(HttpStatus.CREATED);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return user.id;
  }
});
