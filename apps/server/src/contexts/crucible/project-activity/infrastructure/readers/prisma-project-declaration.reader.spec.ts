import { PrismaProjectDeclarationReader } from './prisma-project-declaration.reader';

describe('PrismaProjectDeclarationReader', () => {
  const project = { findFirst: jest.fn(), count: jest.fn() };
  const reader = new PrismaProjectDeclarationReader({ project } as never);

  beforeEach(() => jest.clearAllMocks());

  it('reads the transitions and cycles of the owner’s project in order', async () => {
    const transitions = [
      {
        fromState: 'NOT_STARTED',
        toState: 'ACTIVE',
        occurredAt: new Date('2026-10-01T09:00:00Z'),
        cycleId: 'cycle-1',
      },
    ];
    const cycles = [
      {
        id: 'cycle-1',
        cycleNumber: 1,
        startedAt: new Date('2026-10-01T09:00:00Z'),
      },
    ];
    project.findFirst.mockResolvedValue({
      id: 'project-id',
      transitions,
      cycles,
    });

    await expect(reader.read('owner-id', 'project-id')).resolves.toEqual({
      projectId: 'project-id',
      transitions,
      cycles,
    });
    expect(project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-id', ownerId: 'owner-id' },
      select: {
        id: true,
        transitions: {
          select: {
            fromState: true,
            toState: true,
            occurredAt: true,
            cycleId: true,
          },
          orderBy: { occurredAt: 'asc' },
        },
        cycles: {
          select: { id: true, cycleNumber: true, startedAt: true },
          orderBy: { cycleNumber: 'asc' },
        },
      },
    });
  });

  it('returns null for a project the owner does not have', async () => {
    project.findFirst.mockResolvedValue(null);

    await expect(reader.read('owner-id', 'project-id')).resolves.toBeNull();
  });

  it('checks existence within the owner', async () => {
    project.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(reader.exists('owner-id', 'project-id')).resolves.toBe(true);
    await expect(reader.exists('owner-id', 'project-id')).resolves.toBe(false);
    expect(project.count).toHaveBeenCalledWith({
      where: { id: 'project-id', ownerId: 'owner-id' },
    });
  });
});
