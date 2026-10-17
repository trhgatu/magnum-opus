import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import {
  ACTIVITY_EVENT_WRITER,
  type ActivityEventWriter,
} from '../src/contexts/activity/application/ports/activity-event-writer.port';
import { ActivityFeed } from '../src/contexts/activity/domain/activity-feed.entity';
import {
  ACTIVITY_FEED_REPOSITORY,
  type ActivityFeedRepository,
} from '../src/contexts/activity/domain/ports/activity-feed.repository';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

// Kiểm những gì chỉ DB thật chứng minh được: mốc chỉ nở ra khi hai lần chép
// chồng nhau, sổ bỏ qua event trùng khóa, và unique của feed.
describe('Activity ledger (E2E, database)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let feeds: ActivityFeedRepository;
  let writer: ActivityEventWriter;
  let ownerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    feeds = app.get(ACTIVITY_FEED_REPOSITORY);
    writer = app.get(ACTIVITY_EVENT_WRITER);
    ownerId = await registerOwner();
  });

  afterAll(async () => {
    await app?.close();
  });

  const newFeed = (externalResourceId: string) =>
    ActivityFeed.create({
      id: crypto.randomUUID(),
      ownerId,
      provider: 'GITHUB',
      externalAccountId: '127409189',
      externalResourceId,
      displayName: 'trhgatu/magnum-opus',
      now: new Date('2026-10-16T09:00:00.000Z'),
    });

  it('refuses a second feed for the same resource of the same account', async () => {
    await expect(feeds.insert(newFeed('1001'))).resolves.toBe(true);
    await expect(feeds.insert(newFeed('1001'))).resolves.toBe(false);
  });

  it('never lets an older copy that finishes last undo a newer one', async () => {
    const created = newFeed('1002');
    await feeds.insert(created);

    // Hai lần chép đọc feed cùng lúc (chưa chép lần nào).
    const newer = (await feeds.findById(ownerId, created.id))!;
    const older = (await feeds.findById(ownerId, created.id))!;

    // Bắt đầu 10:00, xong trước.
    newer.recordSuccess({
      window: {
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-10-16T10:00:00.000Z'),
      },
      displayName: 'trhgatu/magnum-opus-renamed',
      now: new Date('2026-10-16T10:00:00.000Z'),
    });
    await feeds.saveSyncResult(newer);

    // Bắt đầu 09:58 với tên cũ, xong sau.
    older.recordSuccess({
      window: {
        from: new Date('2026-10-01T00:00:00.000Z'),
        to: new Date('2026-10-16T09:58:00.000Z'),
      },
      displayName: 'trhgatu/magnum-opus',
      now: new Date('2026-10-16T09:58:00.000Z'),
    });
    await feeds.saveSyncResult(older);

    const stored = (await feeds.findById(ownerId, created.id))!;
    expect(stored.coveredFrom).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(stored.syncedUntil).toEqual(new Date('2026-10-16T10:00:00.000Z'));
    expect(stored.displayName).toBe('trhgatu/magnum-opus-renamed');
    expect(stored.lastSyncAt).toEqual(new Date('2026-10-16T10:00:00.000Z'));
  });

  it('starts coverage again after a gap instead of claiming it was covered', async () => {
    const created = newFeed('1005');
    await feeds.insert(created);
    const first = (await feeds.findById(ownerId, created.id))!;
    first.recordSuccess({
      window: {
        from: new Date('2026-09-25T00:00:00.000Z'),
        to: new Date('2026-10-01T00:00:00.000Z'),
      },
      displayName: 'wakatime-project',
      now: new Date('2026-10-01T00:00:00.000Z'),
    });
    await feeds.saveSyncResult(first);

    // Nguồn giữ 7 ngày, chép lại 16/10: không nối được với 01/10.
    const late = (await feeds.findById(ownerId, created.id))!;
    late.recordSuccess({
      window: {
        from: new Date('2026-10-09T10:00:00.000Z'),
        to: new Date('2026-10-16T10:00:00.000Z'),
      },
      displayName: 'wakatime-project',
      now: new Date('2026-10-16T10:00:00.000Z'),
    });
    await feeds.saveSyncResult(late);

    const stored = (await feeds.findById(ownerId, created.id))!;
    expect(stored.coveredFrom).toEqual(new Date('2026-10-09T10:00:00.000Z'));
    expect(stored.syncedUntil).toEqual(new Date('2026-10-16T10:00:00.000Z'));
  });

  it('keeps one row per event however many times it is copied', async () => {
    const feed = newFeed('1003');
    await feeds.insert(feed);
    const occurredAt = new Date('2026-10-05T04:38:41.000Z');
    const commit = {
      kind: 'COMMIT_AUTHORED' as const,
      occurredAt,
      quantity: 1,
      dedupeKey: 'a'.repeat(64),
    };
    const opened = {
      kind: 'PR_OPENED' as const,
      occurredAt,
      quantity: 1,
      dedupeKey: '162',
    };
    // Cùng khóa, khác loại: không đụng nhau.
    const merged = { ...opened, kind: 'PR_MERGED' as const };

    await expect(writer.append(feed.id, [commit, opened])).resolves.toBe(2);
    await expect(
      writer.append(feed.id, [commit, opened, merged]),
    ).resolves.toBe(1);

    await expect(
      prisma.activityEvent.count({ where: { feedId: feed.id } }),
    ).resolves.toBe(3);
  });

  it('does not show a feed to another owner', async () => {
    const feed = newFeed('1004');
    await feeds.insert(feed);

    await expect(feeds.findById('someone-else', feed.id)).resolves.toBeNull();
  });

  async function registerOwner(): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `activity.${suffix}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `activity_${suffix}`.slice(0, 50),
        password: 'activity-password-123',
      })
      .expect(HttpStatus.CREATED);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return user.id;
  }
});
