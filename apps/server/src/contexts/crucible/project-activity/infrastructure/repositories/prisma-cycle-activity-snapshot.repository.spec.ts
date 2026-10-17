import type { CycleActivitySnapshot } from '../../domain/ports/cycle-activity-snapshot.repository';
import { PrismaCycleActivitySnapshotRepository } from './prisma-cycle-activity-snapshot.repository';

const at = (iso: string) => new Date(iso);

const snapshot: CycleActivitySnapshot = {
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
      dataUntil: at('2026-10-03T17:00:05Z'),
    },
  ],
  timeZone: 'Asia/Ho_Chi_Minh',
  dataUntil: at('2026-10-03T17:00:05Z'),
  capturedAt: at('2026-10-03T17:00:06Z'),
};

const row = {
  id: 'snapshot-id',
  cycleId: 'cycle-1',
  activeDays: 2,
  pausedActiveDays: 1,
  commits: 5,
  prsOpened: 1,
  prsMerged: 1,
  lastActivityAt: snapshot.lastActivityAt,
  days: [{ date: '2026-10-02', state: 'ACTIVE' }],
  sources: [
    {
      provider: 'GITHUB',
      displayName: 'trhgatu/magnum-opus',
      coveredFrom: '2026-09-24T09:00:00.000Z',
      dataUntil: '2026-10-03T17:00:05.000Z',
    },
  ],
  timeZone: 'Asia/Ho_Chi_Minh',
  dataUntil: snapshot.dataUntil,
  capturedAt: snapshot.capturedAt,
};

describe('PrismaCycleActivitySnapshotRepository', () => {
  const cycleActivitySnapshot = {
    count: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  };
  const repository = new PrismaCycleActivitySnapshotRepository({
    cycleActivitySnapshot,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates the snapshot only if the cycle has none — never overwrites', async () => {
    await repository.createIfAbsent(snapshot);

    expect(cycleActivitySnapshot.createMany).toHaveBeenCalledWith({
      data: [
        {
          cycleId: 'cycle-1',
          activeDays: 2,
          pausedActiveDays: 1,
          commits: 5,
          prsOpened: 1,
          prsMerged: 1,
          lastActivityAt: snapshot.lastActivityAt,
          days: row.days,
          sources: row.sources,
          timeZone: 'Asia/Ho_Chi_Minh',
          dataUntil: snapshot.dataUntil,
          capturedAt: snapshot.capturedAt,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('reads the snapshots of the owner’s project, newest first', async () => {
    cycleActivitySnapshot.findMany.mockResolvedValue([row]);

    await expect(
      repository.listByProject('owner-id', 'project-id'),
    ).resolves.toEqual([snapshot]);
    expect(cycleActivitySnapshot.findMany).toHaveBeenCalledWith({
      where: { cycle: { projectId: 'project-id', ownerId: 'owner-id' } },
      orderBy: { capturedAt: 'desc' },
    });
  });

  it('drops malformed JSON entries instead of failing the page', async () => {
    cycleActivitySnapshot.findMany.mockResolvedValue([
      {
        ...row,
        days: [{ date: '2026-10-02', state: 'BUSY' }, 'nonsense'],
        sources: { not: 'an array' },
      },
    ]);

    const [read] = await repository.listByProject('owner-id', 'project-id');

    expect(read.days).toEqual([]);
    expect(read.sources).toEqual([]);
  });

  it('knows whether a cycle has a snapshot', async () => {
    cycleActivitySnapshot.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await expect(repository.exists('cycle-1')).resolves.toBe(true);
    await expect(repository.exists('cycle-1')).resolves.toBe(false);
  });
});
