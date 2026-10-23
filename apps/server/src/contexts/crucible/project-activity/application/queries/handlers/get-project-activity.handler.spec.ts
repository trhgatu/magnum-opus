import type { LedgerFeed } from '@activity/application/ports/activity-ledger-reader.port';

import { CODING_LOOKBACK_MS } from '../../../domain/coding-time';
import type { LifecycleTransition } from '../../../domain/declaration-timeline';
import { GetProjectActivityQuery, ListActivitySourcesQuery } from '..';
import { GetProjectActivityHandler } from './get-project-activity.handler';
import { ListActivitySourcesHandler } from './list-activity-sources.handler';

const at = (iso: string) => new Date(iso);
const NOW = at('2026-10-03T12:00:00Z');
const CYCLE_START = at('2026-10-01T09:00:00Z');

const started: LifecycleTransition = {
  fromState: 'NOT_STARTED',
  toState: 'ACTIVE',
  occurredAt: CYCLE_START,
  cycleId: 'cycle-1',
};

describe('project activity queries', () => {
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

  const link = {
    projectId: 'project-id',
    feedId: 'feed-id',
    ownerId: 'owner-id',
    linkedAt: at('2026-10-02T00:00:00Z'),
  };
  const feed: LedgerFeed = {
    feedId: 'feed-id',
    provider: 'GITHUB',
    externalAccountId: '127409189',
    externalResourceId: '1067270000',
    displayName: 'trhgatu/magnum-opus',
    status: 'ACTIVE',
    lastErrorCode: null,
    coveredFrom: at('2026-09-24T09:00:00Z'),
    syncedUntil: at('2026-10-03T11:55:00Z'),
    lastSyncAt: at('2026-10-03T11:55:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    declarations.exists.mockResolvedValue(true);
    declarations.read.mockResolvedValue({
      projectId: 'project-id',
      transitions: [started],
      cycles: [{ id: 'cycle-1', cycleNumber: 1, startedAt: CYCLE_START }],
    });
    timeZones.getForUser.mockResolvedValue('UTC');
    sources.listByProject.mockResolvedValue([link]);
    sync.syncFeed.mockResolvedValue(null);
    ledger.listFeeds.mockResolvedValue([feed]);
    ledger.listEvents.mockResolvedValue([
      {
        feedId: 'feed-id',
        kind: 'COMMIT_AUTHORED',
        occurredAt: at('2026-10-02T15:00:00Z'),
        quantity: 1,
      },
    ]);
  });

  describe('GetProjectActivityHandler', () => {
    const handler = new GetProjectActivityHandler(
      declarations,
      sources,
      sync as never,
      ledger,
      timeZones,
      { now: () => NOW },
    );
    const query = () =>
      new GetProjectActivityQuery({
        ownerId: 'owner-id',
        projectId: 'project-id',
      });

    it('copies each source back to the cycle start, then summarizes the cycle', async () => {
      const result = await handler.execute(query());

      expect(sync.syncFeed).toHaveBeenCalledWith({
        ownerId: 'owner-id',
        feedId: 'feed-id',
        neededFrom: CYCLE_START,
      });
      expect(ledger.listEvents).toHaveBeenCalledWith({
        ownerId: 'owner-id',
        feedIds: ['feed-id'],
        // Lùi thêm để giữ đoạn code vắt qua đầu Cycle.
        from: new Date(CYCLE_START.getTime() - CODING_LOOKBACK_MS),
        to: NOW,
      });

      const view = result.getValue();
      expect(view.sources).toEqual([{ ...feed, linkedAt: link.linkedAt }]);
      expect(view.timeZone).toBe('UTC');
      expect(view.currentCycle).toMatchObject({
        cycleId: 'cycle-1',
        cycleNumber: 1,
        startedAt: CYCLE_START,
        metrics: { activeDays: 1, commits: 1 },
        days: [
          { date: '2026-10-01', state: 'IDLE' },
          { date: '2026-10-02', state: 'ACTIVE' },
          { date: '2026-10-03', state: 'IDLE' },
        ],
        hasMissingData: false,
      });
      expect(view.divergences).toEqual([]);
    });

    it('answers without copying or reading the ledger when there is no source', async () => {
      sources.listByProject.mockResolvedValue([]);

      const result = await handler.execute(query());

      expect(result.getValue()).toEqual({
        projectId: 'project-id',
        timeZone: 'UTC',
        sources: [],
        currentCycle: null,
        divergences: [],
      });
      expect(sync.syncFeed).not.toHaveBeenCalled();
      expect(ledger.listEvents).not.toHaveBeenCalled();
    });

    it('never fails the request because a copy failed', async () => {
      sync.syncFeed.mockRejectedValue(new Error('GitHub exploded'));

      const result = await handler.execute(query());

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().sources).toHaveLength(1);
    });

    it('has no current cycle for a project that is not started, but shows D4', async () => {
      declarations.read.mockResolvedValue({
        projectId: 'project-id',
        transitions: [],
        cycles: [],
      });

      const view = (await handler.execute(query())).getValue();

      // Không có Cycle: đọc sổ từ lúc gắn.
      expect(ledger.listEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          from: new Date(link.linkedAt.getTime() - CODING_LOOKBACK_MS),
        }),
      );
      expect(view.currentCycle).toBeNull();
      expect(view.divergences).toEqual([
        {
          kind: 'ACTIVITY_BEFORE_START',
          lastActivityAt: at('2026-10-02T15:00:00Z'),
        },
      ]);
    });

    it('refuses a project the owner does not have', async () => {
      declarations.read.mockResolvedValue(null);

      const result = await handler.execute(query());

      expect(result.getError().error.code).toBe('PROJECT_NOT_FOUND');
      expect(sources.listByProject).not.toHaveBeenCalled();
    });
  });

  describe('ListActivitySourcesHandler', () => {
    const handler = new ListActivitySourcesHandler(
      declarations,
      sources,
      ledger,
    );
    const query = () =>
      new ListActivitySourcesQuery({
        ownerId: 'owner-id',
        projectId: 'project-id',
      });

    it('lists the sources as the ledger has them, without copying', async () => {
      const result = await handler.execute(query());

      expect(result.getValue()).toEqual([{ ...feed, linkedAt: link.linkedAt }]);
      expect(sync.syncFeed).not.toHaveBeenCalled();
    });

    it('refuses a project the owner does not have', async () => {
      declarations.exists.mockResolvedValue(false);

      const result = await handler.execute(query());

      expect(result.getError().error.code).toBe('PROJECT_NOT_FOUND');
    });
  });
});
