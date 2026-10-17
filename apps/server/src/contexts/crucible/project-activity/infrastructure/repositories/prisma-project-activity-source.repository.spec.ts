import { Prisma } from '@repo/database';

import { PrismaProjectActivitySourceRepository } from './prisma-project-activity-source.repository';

describe('PrismaProjectActivitySourceRepository', () => {
  const projectActivitySource = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  };
  const repository = new PrismaProjectActivitySourceRepository({
    projectActivitySource,
  } as never);

  const link = {
    projectId: 'project-id',
    feedId: 'feed-id',
    ownerId: 'owner-id',
    linkedAt: new Date('2026-10-02T00:00:00Z'),
  };

  beforeEach(() => jest.clearAllMocks());

  it('lists the links of the owner’s project, oldest first', async () => {
    projectActivitySource.findMany.mockResolvedValue([link]);

    await expect(
      repository.listByProject('owner-id', 'project-id'),
    ).resolves.toEqual([link]);
    expect(projectActivitySource.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-id', ownerId: 'owner-id' },
      orderBy: { linkedAt: 'asc' },
    });
  });

  it('finds one link within the owner', async () => {
    projectActivitySource.findFirst.mockResolvedValue(link);

    await repository.findOne('owner-id', 'project-id', 'feed-id');

    expect(projectActivitySource.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: 'project-id',
        feedId: 'feed-id',
        ownerId: 'owner-id',
      },
    });
  });

  const conflict = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: 'test',
    });

  it('links and returns the stored link', async () => {
    projectActivitySource.create.mockResolvedValueOnce(link);

    await expect(repository.link(link)).resolves.toEqual({
      link,
      created: true,
    });
    expect(projectActivitySource.create).toHaveBeenCalledWith({ data: link });
  });

  it('returns the existing link, with its own link time, when already linked', async () => {
    const earlier = { ...link, linkedAt: new Date('2026-09-30T00:00:00Z') };
    projectActivitySource.create.mockRejectedValueOnce(conflict());
    projectActivitySource.findFirst.mockResolvedValueOnce(earlier);

    await expect(repository.link(link)).resolves.toEqual({
      link: earlier,
      created: false,
    });
  });

  it('links again when the existing link was removed in between', async () => {
    projectActivitySource.create
      .mockRejectedValueOnce(conflict())
      .mockResolvedValueOnce(link);
    projectActivitySource.findFirst.mockResolvedValueOnce(null);

    await expect(repository.link(link)).resolves.toEqual({
      link,
      created: true,
    });
  });

  it('lets other database errors surface on link', async () => {
    projectActivitySource.create.mockRejectedValueOnce(new Error('down'));

    await expect(repository.link(link)).rejects.toThrow('down');
  });

  it('unlinks within the owner and says whether there was a link', async () => {
    projectActivitySource.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(
      repository.unlink('owner-id', 'project-id', 'feed-id'),
    ).resolves.toBe(true);
    expect(projectActivitySource.deleteMany).toHaveBeenCalledWith({
      where: {
        projectId: 'project-id',
        feedId: 'feed-id',
        ownerId: 'owner-id',
      },
    });

    projectActivitySource.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      repository.unlink('owner-id', 'project-id', 'feed-id'),
    ).resolves.toBe(false);
  });
});
