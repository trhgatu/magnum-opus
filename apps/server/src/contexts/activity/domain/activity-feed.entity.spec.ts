import { ActivityFeed } from './activity-feed.entity';

const minutes = (n: number) => n * 60_000;
const days = (n: number) => n * 86_400_000;

describe('ActivityFeed', () => {
  const now = new Date('2026-10-16T10:00:00.000Z');

  const create = () =>
    ActivityFeed.create({
      id: 'feed-id',
      ownerId: 'owner-id',
      provider: 'GITHUB',
      externalAccountId: '127409189',
      externalResourceId: '1067270000',
      displayName: 'trhgatu/magnum-opus',
      now,
    });

  /** Feed đã chép một lần, phủ [coveredFrom, syncedUntil). */
  const synced = (input: {
    coveredFrom: Date;
    syncedUntil: Date;
    lastSyncAt?: Date;
  }) =>
    ActivityFeed.rehydrate({
      ...create().toSnapshot(),
      coveredFrom: input.coveredFrom,
      syncedUntil: input.syncedUntil,
      lastSyncAt: input.lastSyncAt ?? input.syncedUntil,
    });

  it('starts ACTIVE with nothing copied yet', () => {
    const feed = create();

    expect(feed.toSnapshot()).toEqual({
      id: 'feed-id',
      ownerId: 'owner-id',
      provider: 'GITHUB',
      externalAccountId: '127409189',
      externalResourceId: '1067270000',
      displayName: 'trhgatu/magnum-opus',
      coveredFrom: null,
      syncedUntil: null,
      lastSyncAt: null,
      status: 'ACTIVE',
      lastErrorCode: null,
      createdAt: now,
    });
  });

  it('never shares its dates with the outside', () => {
    const feed = synced({
      coveredFrom: new Date('2026-10-01T00:00:00.000Z'),
      syncedUntil: new Date('2026-10-15T00:00:00.000Z'),
    });

    feed.syncedUntil?.setFullYear(1999);
    feed.toSnapshot().coveredFrom?.setFullYear(1999);

    expect(feed.syncedUntil).toEqual(new Date('2026-10-15T00:00:00.000Z'));
    expect(feed.coveredFrom).toEqual(new Date('2026-10-01T00:00:00.000Z'));
  });

  describe('isStaleAt', () => {
    it('is stale before its first copy', () => {
      expect(create().isStaleAt(now)).toBe(true);
    });

    it('stays fresh for 10 minutes after a copy', () => {
      const feed = synced({
        coveredFrom: new Date('2026-10-01T00:00:00.000Z'),
        syncedUntil: now,
      });

      expect(feed.isStaleAt(new Date(now.getTime() + minutes(9)))).toBe(false);
      expect(feed.isStaleAt(new Date(now.getTime() + minutes(10)))).toBe(true);
    });
  });

  describe('needsSyncAt', () => {
    const neededFrom = new Date('2026-10-01T00:00:00.000Z');
    const at = (minutesLater: number) =>
      new Date(now.getTime() + minutes(minutesLater));

    it('needs a copy when the last one is older than 10 minutes', () => {
      const feed = synced({ coveredFrom: neededFrom, syncedUntil: now });

      expect(
        feed.needsSyncAt({ neededFrom, now: at(5), historyWindowDays: null }),
      ).toBe(false);
      expect(
        feed.needsSyncAt({ neededFrom, now: at(10), historyWindowDays: null }),
      ).toBe(true);
    });

    it('needs a copy right away when a project needs history the feed lacks', () => {
      // Vừa chép xong, nhưng một Project mới cần từ 01/09.
      const feed = synced({ coveredFrom: neededFrom, syncedUntil: now });

      expect(
        feed.needsSyncAt({
          neededFrom: new Date('2026-09-01T00:00:00.000Z'),
          now: at(1),
          historyWindowDays: null,
        }),
      ).toBe(true);
    });

    it('does not chase history a limited source no longer keeps', () => {
      const feed = synced({
        coveredFrom: new Date(now.getTime() - days(7)),
        syncedUntil: now,
      });

      expect(
        feed.needsSyncAt({
          neededFrom: new Date('2026-09-01T00:00:00.000Z'),
          now: at(1),
          historyWindowDays: 7,
        }),
      ).toBe(false);
    });

    it('waits out the 10 minutes after a failure, even when history is missing', () => {
      // Lần chép đầu vừa lỗi: không gọi lại nguồn ở mỗi lần mở trang.
      const feed = create();
      feed.recordFailure({ code: 'GITHUB_UNAVAILABLE', now });

      expect(
        feed.needsSyncAt({ neededFrom, now: at(1), historyWindowDays: null }),
      ).toBe(false);
    });
  });

  describe('planSync', () => {
    const neededFrom = new Date('2026-10-01T00:00:00.000Z');

    it('reaches a wide buffer before the needed time on the first copy', () => {
      expect(
        create().planSync({ neededFrom, now, historyWindowDays: null }),
      ).toEqual({
        from: new Date(neededFrom.getTime() - days(7)),
        to: now,
      });
    });

    it('re-reads a 2-day buffer behind the last copy to catch late pushes', () => {
      const syncedUntil = new Date('2026-10-15T00:00:00.000Z');
      const feed = synced({ coveredFrom: neededFrom, syncedUntil });

      expect(
        feed.planSync({ neededFrom, now, historyWindowDays: null }),
      ).toEqual({ from: new Date(syncedUntil.getTime() - days(2)), to: now });
    });

    it('reaches back further when a project needs history the feed lacks', () => {
      const feed = synced({
        coveredFrom: new Date('2026-10-10T00:00:00.000Z'),
        syncedUntil: new Date('2026-10-15T00:00:00.000Z'),
      });

      expect(
        feed.planSync({ neededFrom, now, historyWindowDays: null }),
      ).toEqual({ from: neededFrom, to: now });
    });

    it('never asks a limited source for more than it keeps, even when copying late', () => {
      // Chép lần trước 01/10; nguồn giữ 7 ngày; hôm nay 16/10.
      const feed = synced({
        coveredFrom: new Date('2026-09-25T00:00:00.000Z'),
        syncedUntil: neededFrom,
      });

      expect(feed.planSync({ neededFrom, now, historyWindowDays: 7 })).toEqual({
        from: new Date(now.getTime() - days(7)),
        to: now,
      });
    });

    it('never asks a limited source for more than it keeps', () => {
      // Nguồn chỉ giữ 7 ngày: không hỏi xa hơn now − 7 ngày.
      expect(
        create().planSync({ neededFrom, now, historyWindowDays: 7 }),
      ).toEqual({ from: new Date(now.getTime() - days(7)), to: now });
    });
  });

  describe('recordSuccess', () => {
    it('widens the coverage, takes the current name and clears the error', () => {
      const feed = ActivityFeed.rehydrate({
        ...create().toSnapshot(),
        status: 'ERROR',
        lastErrorCode: 'GITHUB_REPOSITORY_NOT_ACCESSIBLE',
      });
      const window = { from: new Date('2026-09-24T00:00:00.000Z'), to: now };

      feed.recordSuccess({
        window,
        displayName: 'trhgatu/magnum-opus-renamed',
        now,
      });

      expect(feed.toSnapshot()).toMatchObject({
        coveredFrom: window.from,
        syncedUntil: now,
        lastSyncAt: now,
        status: 'ACTIVE',
        lastErrorCode: null,
        displayName: 'trhgatu/magnum-opus-renamed',
      });
    });

    it('only moves coverage outward: syncedUntil forward, coveredFrom back', () => {
      const coveredFrom = new Date('2026-09-01T00:00:00.000Z');
      const syncedUntil = new Date('2026-10-16T09:00:00.000Z');
      const feed = synced({ coveredFrom, syncedUntil });

      // Một lần chép bắt đầu trước, xong sau, với khoảng hẹp hơn.
      feed.recordSuccess({
        window: {
          from: new Date('2026-10-10T00:00:00.000Z'),
          to: new Date('2026-10-16T08:00:00.000Z'),
        },
        displayName: 'trhgatu/magnum-opus',
        now,
      });

      expect(feed.coveredFrom).toEqual(coveredFrom);
      expect(feed.syncedUntil).toEqual(syncedUntil);
    });
  });

  describe('recordSuccess after a gap', () => {
    it('starts coverage again instead of claiming the gap was covered', () => {
      const feed = synced({
        coveredFrom: new Date('2026-09-25T00:00:00.000Z'),
        syncedUntil: new Date('2026-10-01T00:00:00.000Z'),
      });
      const window = { from: new Date('2026-10-09T10:00:00.000Z'), to: now };

      feed.recordSuccess({ window, displayName: 'wakatime-project', now });

      expect(feed.coveredFrom).toEqual(window.from);
      expect(feed.syncedUntil).toEqual(now);
    });
  });

  describe('recordFailure', () => {
    it.each([
      ['GITHUB_NOT_CONNECTED', 'DISCONNECTED'],
      ['GITHUB_TOKEN_EXPIRED', 'DISCONNECTED'],
      ['GITHUB_TOKEN_REVOKED', 'DISCONNECTED'],
      ['GITHUB_ACCOUNT_CHANGED', 'DISCONNECTED'],
      ['GITHUB_REPOSITORY_NOT_ACCESSIBLE', 'ERROR'],
      // Tạm thời: giữ ACTIVE, dùng sổ hiện có, thử lại lần sau.
      ['GITHUB_RATE_LIMITED', 'ACTIVE'],
      ['GITHUB_UNAVAILABLE', 'ACTIVE'],
      // WakaTime theo cùng ba nhóm (BA 08 §4.9).
      ['WAKATIME_NOT_CONNECTED', 'DISCONNECTED'],
      ['WAKATIME_KEY_INVALID', 'DISCONNECTED'],
      ['WAKATIME_ACCOUNT_CHANGED', 'DISCONNECTED'],
      ['WAKATIME_PROJECT_NOT_FOUND', 'ERROR'],
      ['WAKATIME_RATE_LIMITED', 'ACTIVE'],
      ['WAKATIME_UNAVAILABLE', 'ACTIVE'],
    ] as const)('records %s as %s', (code, status) => {
      const feed = create();

      feed.recordFailure({ code, now });

      expect(feed.status).toBe(status);
      expect(feed.lastErrorCode).toBe(code);
      expect(feed.lastSyncAt).toEqual(now);
    });

    it('keeps the coverage it already has', () => {
      const coveredFrom = new Date('2026-09-01T00:00:00.000Z');
      const syncedUntil = new Date('2026-10-15T00:00:00.000Z');
      const feed = synced({ coveredFrom, syncedUntil });

      feed.recordFailure({ code: 'GITHUB_UNAVAILABLE', now });

      expect(feed.coveredFrom).toEqual(coveredFrom);
      expect(feed.syncedUntil).toEqual(syncedUntil);
    });
  });
});
