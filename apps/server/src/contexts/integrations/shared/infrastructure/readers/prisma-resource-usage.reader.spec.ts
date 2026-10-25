import { PrismaResourceUsageReader } from './prisma-resource-usage.reader';

describe('PrismaResourceUsageReader', () => {
  const projectActivitySource = { findMany: jest.fn() };
  const reader = new PrismaResourceUsageReader({
    projectActivitySource,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists the owner’s projects using each resource, once per project', async () => {
    projectActivitySource.findMany.mockResolvedValue([
      {
        feed: { externalResourceId: '1001' },
        project: { id: 'p1', title: 'Magnum Opus' },
      },
      {
        feed: { externalResourceId: '1001' },
        project: { id: 'p2', title: 'Portfolio' },
      },
      // Cùng repo, feed của tài khoản khác, cùng Project.
      {
        feed: { externalResourceId: '1001' },
        project: { id: 'p1', title: 'Magnum Opus' },
      },
    ]);

    await expect(
      reader.usedByProjects('owner-id', 'GITHUB', ['1001', '1002']),
    ).resolves.toEqual({
      '1001': [
        { id: 'p1', title: 'Magnum Opus' },
        { id: 'p2', title: 'Portfolio' },
      ],
    });
    expect(projectActivitySource.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: 'owner-id',
        feed: {
          provider: 'GITHUB',
          externalResourceId: { in: ['1001', '1002'] },
        },
      },
      select: {
        feed: { select: { externalResourceId: true } },
        project: { select: { id: true, title: true } },
      },
      orderBy: { linkedAt: 'asc' },
    });
  });

  it('looks only at sources of the given provider', async () => {
    projectActivitySource.findMany.mockResolvedValue([]);

    await reader.usedByProjects('owner-id', 'WAKATIME', ['project-uuid']);

    expect(projectActivitySource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ownerId: 'owner-id',
          feed: {
            provider: 'WAKATIME',
            externalResourceId: { in: ['project-uuid'] },
          },
        },
      }),
    );
  });

  it('does not query for no resources', async () => {
    await expect(
      reader.usedByProjects('owner-id', 'GITHUB', []),
    ).resolves.toEqual({});
    expect(projectActivitySource.findMany).not.toHaveBeenCalled();
  });
});
