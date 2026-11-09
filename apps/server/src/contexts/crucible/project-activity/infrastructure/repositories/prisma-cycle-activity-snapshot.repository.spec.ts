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
    codingSeconds: 5400,
  },
  lastActivityAt: at('2026-10-02T12:00:00Z'),
  days: [
    { date: '2026-10-02', state: 'ACTIVE', codingSeconds: 5400, commits: 5 },
  ],
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
  codingSeconds: 5400,
  lastActivityAt: snapshot.lastActivityAt,
  days: [
    { date: '2026-10-02', state: 'ACTIVE', codingSeconds: 5400, commits: 5 },
  ],
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
          codingSeconds: 5400,
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
        days: [
          { date: '2026-10-02', state: 'BUSY' },
          'nonsense',
          { date: 'yesterday', state: 'ACTIVE' },
          { date: '2026-10-03', state: 'ACTIVE' },
        ],
        sources: [
          { ...row.sources[0], coveredFrom: 'not a date' },
          row.sources[0],
        ],
      },
    ]);

    const [read] = await repository.listByProject('owner-id', 'project-id');

    expect(read.days).toEqual([
      {
        date: '2026-10-03',
        state: 'ACTIVE',
        codingSeconds: null,
        commits: null,
      },
    ]);
    expect(read.sources).toEqual(snapshot.sources);
  });

  it('reads a snapshot taken before coding time existed as not measured', async () => {
    // Dữ liệu đã lưu không bị sửa: cột null, ngày không có trường.
    cycleActivitySnapshot.findMany.mockResolvedValue([
      {
        ...row,
        codingSeconds: null,
        days: [
          { date: '2026-10-02', state: 'ACTIVE' },
          { date: '2026-10-03', state: 'IDLE', codingSeconds: '600' },
          // Giờ code âm hay lẻ là dữ liệu hỏng: không đưa ra API.
          { date: '2026-10-04', state: 'IDLE', codingSeconds: -5 },
          { date: '2026-10-05', state: 'IDLE', codingSeconds: 90.5 },
          { date: '2026-10-06', state: 'ACTIVE', codingSeconds: 0 },
        ],
      },
    ]);

    const [read] = await repository.listByProject('owner-id', 'project-id');

    expect(read.metrics.codingSeconds).toBeNull();
    expect(read.days).toEqual([
      {
        date: '2026-10-02',
        state: 'ACTIVE',
        codingSeconds: null,
        commits: null,
      },
      { date: '2026-10-03', state: 'IDLE', codingSeconds: null, commits: null },
      { date: '2026-10-04', state: 'IDLE', codingSeconds: null, commits: null },
      { date: '2026-10-05', state: 'IDLE', codingSeconds: null, commits: null },
      // 0 là đo được và không code — giữ nguyên, không thành null.
      { date: '2026-10-06', state: 'ACTIVE', codingSeconds: 0, commits: null },
    ]);
  });

  it('reads commits per day, and a snapshot taken before them as not measured', async () => {
    cycleActivitySnapshot.findMany.mockResolvedValue([
      {
        ...row,
        days: [
          // Chụp trước khi có commit theo ngày: không có trường.
          { date: '2026-10-02', state: 'ACTIVE', codingSeconds: 600 },
          { date: '2026-10-03', state: 'ACTIVE', codingSeconds: 0, commits: 3 },
          { date: '2026-10-04', state: 'IDLE', codingSeconds: 0, commits: 0 },
          // Số âm, số lẻ hay chuỗi là dữ liệu hỏng: không đưa ra API.
          { date: '2026-10-05', state: 'IDLE', codingSeconds: 0, commits: -1 },
          { date: '2026-10-06', state: 'IDLE', codingSeconds: 0, commits: 1.5 },
          { date: '2026-10-07', state: 'IDLE', codingSeconds: 0, commits: '2' },
        ],
      },
    ]);

    const [read] = await repository.listByProject('owner-id', 'project-id');

    expect(read.days.map(({ date, commits }) => ({ date, commits }))).toEqual([
      { date: '2026-10-02', commits: null },
      { date: '2026-10-03', commits: 3 },
      // 0 là có GitHub và không commit — giữ nguyên, không thành null.
      { date: '2026-10-04', commits: 0 },
      { date: '2026-10-05', commits: null },
      { date: '2026-10-06', commits: null },
      { date: '2026-10-07', commits: null },
    ]);
  });

  it('knows whether a cycle has a snapshot', async () => {
    cycleActivitySnapshot.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await expect(repository.exists('cycle-1')).resolves.toBe(true);
    await expect(repository.exists('cycle-1')).resolves.toBe(false);
  });
});
