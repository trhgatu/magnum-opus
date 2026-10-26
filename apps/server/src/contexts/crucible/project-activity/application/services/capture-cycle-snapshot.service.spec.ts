import type { LedgerFeed } from '@activity/application/ports/activity-ledger-reader.port';

import { CODING_LOOKBACK_MS } from '../../domain/coding-time';
import type { LifecycleTransition } from '../../domain/declaration-timeline';
import { CaptureCycleSnapshotService } from './capture-cycle-snapshot.service';

const at = (iso: string) => new Date(iso);
const START = at('2026-10-01T09:00:00Z');
const CLOSED = at('2026-10-03T17:00:00Z');
const NOW = at('2026-10-03T17:00:05Z');

const transitions: LifecycleTransition[] = [
  {
    fromState: 'NOT_STARTED',
    toState: 'ACTIVE',
    occurredAt: START,
    cycleId: 'cycle-1',
  },
  {
    fromState: 'ACTIVE',
    toState: 'COMPLETED',
    occurredAt: CLOSED,
    cycleId: 'cycle-1',
  },
];

describe('CaptureCycleSnapshotService', () => {
  const snapshots = {
    exists: jest.fn(),
    createIfAbsent: jest.fn(),
    listByProject: jest.fn(),
  };
  const declarations = { read: jest.fn(), exists: jest.fn() };
  const sources = {
    listByProject: jest.fn(),
    findOne: jest.fn(),
    link: jest.fn(),
    unlink: jest.fn(),
  };
  const sync = { syncFeed: jest.fn() };
  const ledger = { listFeeds: jest.fn(), listEvents: jest.fn() };
  const timeZones = { getForUser: jest.fn() };
  const service = new CaptureCycleSnapshotService(
    snapshots,
    declarations,
    sources,
    sync as never,
    ledger,
    timeZones,
    { now: () => NOW },
  );

  const feed: LedgerFeed = {
    feedId: 'feed-id',
    provider: 'GITHUB',
    externalAccountId: '127409189',
    externalResourceId: '1067270000',
    displayName: 'trhgatu/magnum-opus',
    status: 'ACTIVE',
    lastErrorCode: null,
    coveredFrom: at('2026-09-24T09:00:00Z'),
    syncedUntil: NOW,
    lastSyncAt: NOW,
  };

  const capture = () =>
    service.capture({
      ownerId: 'owner-id',
      projectId: 'project-id',
      cycleId: 'cycle-1',
      closedAt: CLOSED,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    snapshots.exists.mockResolvedValue(false);
    declarations.read.mockResolvedValue({
      projectId: 'project-id',
      transitions,
      cycles: [{ id: 'cycle-1', cycleNumber: 1, startedAt: START }],
    });
    sources.listByProject.mockResolvedValue([
      {
        projectId: 'project-id',
        feedId: 'feed-id',
        ownerId: 'owner-id',
        linkedAt: at('2026-10-02T00:00:00Z'),
      },
    ]);
    sync.syncFeed.mockResolvedValue(null);
    ledger.listFeeds.mockResolvedValue([feed]);
    ledger.listEvents.mockResolvedValue([
      {
        feedId: 'feed-id',
        kind: 'COMMIT_AUTHORED',
        occurredAt: at('2026-10-02T12:00:00Z'),
        quantity: 1,
      },
    ]);
    timeZones.getForUser.mockResolvedValue('UTC');
  });

  it('copies one last time, then freezes the cycle activity up to the close', async () => {
    await capture();

    expect(sync.syncFeed).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      feedId: 'feed-id',
      neededFrom: START,
    });
    expect(ledger.listEvents).toHaveBeenCalledWith({
      ownerId: 'owner-id',
      feedIds: ['feed-id'],
      // Lùi thêm để giữ đoạn code vắt qua lúc Cycle mở.
      from: new Date(START.getTime() - CODING_LOOKBACK_MS),
      to: CLOSED,
    });
    expect(snapshots.createIfAbsent).toHaveBeenCalledWith({
      cycleId: 'cycle-1',
      metrics: {
        activeDays: 1,
        pausedActiveDays: 0,
        commits: 1,
        prsOpened: 0,
        prsMerged: 0,
        // Chỉ có GitHub: không đo thời gian code.
        codingSeconds: null,
      },
      lastActivityAt: at('2026-10-02T12:00:00Z'),
      days: [
        { date: '2026-10-01', state: 'IDLE', codingSeconds: null },
        { date: '2026-10-02', state: 'ACTIVE', codingSeconds: null },
        { date: '2026-10-03', state: 'IDLE', codingSeconds: null },
      ],
      sources: [
        {
          provider: 'GITHUB',
          displayName: 'trhgatu/magnum-opus',
          coveredFrom: feed.coveredFrom,
          dataUntil: NOW,
        },
      ],
      timeZone: 'UTC',
      dataUntil: NOW,
      capturedAt: NOW,
    });
  });

  it('freezes the coding time too when a WakaTime source is linked', async () => {
    ledger.listFeeds.mockResolvedValue([
      { ...feed, provider: 'WAKATIME', displayName: 'magnum-opus' },
    ]);
    ledger.listEvents.mockResolvedValue([
      {
        feedId: 'feed-id',
        kind: 'CODING_TIME',
        occurredAt: at('2026-10-02T10:00:00Z'),
        quantity: 1800,
      },
    ]);

    await capture();

    const [snapshot] = snapshots.createIfAbsent.mock.calls[0];
    expect(snapshot.metrics.codingSeconds).toBe(1800);
    expect(snapshot.days.map((day) => day.codingSeconds)).toEqual([0, 1800, 0]);
  });

  it('does nothing for a cycle that already has a snapshot', async () => {
    snapshots.exists.mockResolvedValue(true);

    await capture();

    expect(sync.syncFeed).not.toHaveBeenCalled();
    expect(snapshots.createIfAbsent).not.toHaveBeenCalled();
  });

  it('takes no snapshot of a cycle without sources', async () => {
    sources.listByProject.mockResolvedValue([]);

    await capture();

    expect(snapshots.createIfAbsent).not.toHaveBeenCalled();
  });

  it('takes no snapshot when the project is gone', async () => {
    declarations.read.mockResolvedValue(null);

    await capture();

    expect(snapshots.createIfAbsent).not.toHaveBeenCalled();
  });

  it('still captures once the time limit passes on a copy that hangs', async () => {
    jest.useFakeTimers();
    try {
      sync.syncFeed.mockReturnValue(new Promise(() => undefined));

      const capturing = capture();
      await jest.advanceTimersByTimeAsync(10_000);
      await capturing;

      expect(snapshots.createIfAbsent).toHaveBeenCalledWith(
        expect.objectContaining({ cycleId: 'cycle-1' }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('still captures from the ledger it has when the last copy fails', async () => {
    sync.syncFeed.mockRejectedValue(new Error('GitHub down'));

    await capture();

    expect(snapshots.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ cycleId: 'cycle-1' }),
    );
  });
});
