import { PrismaGitHubRepositoryUsageReader } from './prisma-github-repository-usage.reader';

describe('PrismaGitHubRepositoryUsageReader', () => {
  const projectActivitySource = { findMany: jest.fn() };
  const reader = new PrismaGitHubRepositoryUsageReader({
    projectActivitySource,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists the owner’s projects using each repository, once per project', async () => {
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
      reader.usedByProjects('owner-id', ['1001', '1002']),
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

  it('does not query for no repositories', async () => {
    await expect(reader.usedByProjects('owner-id', [])).resolves.toEqual({});
    expect(projectActivitySource.findMany).not.toHaveBeenCalled();
  });
});
