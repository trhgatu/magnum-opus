import type { ActivitySourceView } from '../../application/views';
import { ProjectActivityPresenter } from './project-activity.presenter';

const at = (iso: string) => new Date(iso);

const source: ActivitySourceView = {
  feedId: 'feed-id',
  provider: 'GITHUB',
  externalAccountId: '127409189',
  externalResourceId: '1067270000',
  displayName: 'trhgatu/magnum-opus',
  status: 'DISCONNECTED',
  lastErrorCode: 'GITHUB_TOKEN_EXPIRED',
  coveredFrom: at('2026-09-24T09:00:00Z'),
  syncedUntil: at('2026-10-03T11:55:00Z'),
  lastSyncAt: at('2026-10-03T12:00:00Z'),
  linkedAt: at('2026-10-02T00:00:00Z'),
};

describe('ProjectActivityPresenter', () => {
  it('presents a source with its stable error code only', () => {
    expect(ProjectActivityPresenter.toSourceResponse(source)).toEqual({
      feedId: 'feed-id',
      provider: 'GITHUB',
      externalResourceId: '1067270000',
      displayName: 'trhgatu/magnum-opus',
      status: 'DISCONNECTED',
      linkedAt: '2026-10-02T00:00:00.000Z',
      lastSyncAt: '2026-10-03T12:00:00.000Z',
      coveredFrom: '2026-09-24T09:00:00.000Z',
      syncedUntil: '2026-10-03T11:55:00.000Z',
      error: { code: 'GITHUB_TOKEN_EXPIRED' },
    });
  });

  it('presents a healthy, never-copied source with null dates and no error', () => {
    expect(
      ProjectActivityPresenter.toSourceResponse({
        ...source,
        status: 'ACTIVE',
        lastErrorCode: null,
        coveredFrom: null,
        syncedUntil: null,
        lastSyncAt: null,
      }),
    ).toMatchObject({
      coveredFrom: null,
      syncedUntil: null,
      lastSyncAt: null,
      error: null,
    });
  });

  it('presents the activity, the cycle and the divergences with ISO dates', () => {
    const response = ProjectActivityPresenter.toResponse({
      projectId: 'project-id',
      timeZone: 'Asia/Ho_Chi_Minh',
      sources: [source],
      currentCycle: {
        cycleId: 'cycle-1',
        cycleNumber: 2,
        startedAt: at('2026-10-01T09:00:00Z'),
        metrics: {
          activeDays: 1,
          pausedActiveDays: 0,
          commits: 3,
          prsOpened: 1,
          prsMerged: 0,
        },
        lastActivityAt: at('2026-10-02T15:00:00Z'),
        days: [{ date: '2026-10-02', state: 'ACTIVE' }],
        hasMissingData: true,
        dataUntil: at('2026-10-03T11:55:00Z'),
      },
      divergences: [
        {
          kind: 'ACTIVITY_AFTER_CLOSE',
          closedAs: 'COMPLETED',
          commits: 2,
          otherEvents: 1,
          lastActivityAt: at('2026-10-14T00:00:00Z'),
        },
        { kind: 'PAUSED_WITH_ACTIVITY', activeDays: 2 },
      ],
    });

    expect(response.currentCycle).toEqual({
      cycleId: 'cycle-1',
      cycleNumber: 2,
      startedAt: '2026-10-01T09:00:00.000Z',
      metrics: {
        activeDays: 1,
        pausedActiveDays: 0,
        commits: 3,
        prsOpened: 1,
        prsMerged: 0,
      },
      lastActivityAt: '2026-10-02T15:00:00.000Z',
      days: [{ date: '2026-10-02', state: 'ACTIVE' }],
      hasMissingData: true,
      dataUntil: '2026-10-03T11:55:00.000Z',
    });
    expect(response.divergences).toEqual([
      {
        kind: 'ACTIVITY_AFTER_CLOSE',
        closedAs: 'COMPLETED',
        commits: 2,
        otherEvents: 1,
        lastActivityAt: '2026-10-14T00:00:00.000Z',
      },
      { kind: 'PAUSED_WITH_ACTIVITY', activeDays: 2 },
    ]);
    expect(response.timeZone).toBe('Asia/Ho_Chi_Minh');
  });

  it('presents a snapshot exactly as captured, with ISO dates', () => {
    expect(
      ProjectActivityPresenter.toSnapshotResponse({
        cycleId: 'cycle-1',
        metrics: {
          activeDays: 2,
          pausedActiveDays: 1,
          commits: 5,
          prsOpened: 1,
          prsMerged: 1,
        },
        lastActivityAt: at('2026-10-02T12:00:00Z'),
        days: [{ date: '2026-10-02', state: 'ACTIVE' }],
        sources: [
          {
            provider: 'GITHUB',
            displayName: 'trhgatu/magnum-opus',
            coveredFrom: at('2026-09-24T09:00:00Z'),
            dataUntil: null,
          },
        ],
        timeZone: 'Asia/Ho_Chi_Minh',
        dataUntil: null,
        capturedAt: at('2026-10-03T17:00:06Z'),
      }),
    ).toEqual({
      cycleId: 'cycle-1',
      metrics: {
        activeDays: 2,
        pausedActiveDays: 1,
        commits: 5,
        prsOpened: 1,
        prsMerged: 1,
      },
      lastActivityAt: '2026-10-02T12:00:00.000Z',
      days: [{ date: '2026-10-02', state: 'ACTIVE' }],
      sources: [
        {
          provider: 'GITHUB',
          displayName: 'trhgatu/magnum-opus',
          coveredFrom: '2026-09-24T09:00:00.000Z',
          dataUntil: null,
        },
      ],
      timeZone: 'Asia/Ho_Chi_Minh',
      dataUntil: null,
      capturedAt: '2026-10-03T17:00:06.000Z',
    });
  });
});
