import type { Project as PrismaProject } from '@repo/database';

import { ProjectLifecycleState } from '../../domain/enums';
import { PrismaProjectWithCycles } from '../mappers/prisma-project.mapper';
import { PrismaProjectReader } from './prisma-project.reader';

describe('PrismaProjectReader', () => {
  const projectModel = {
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const prisma = {
    project: projectModel,
    $transaction: jest.fn(),
  };
  const reader = new PrismaProjectReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    projectModel.findMany.mockReturnValue('find-many-query');
    projectModel.count.mockReturnValue('count-query');
    prisma.$transaction.mockResolvedValue([[rawProject()], 1]);
  });

  it('applies ownership, state, search and pagination', async () => {
    const result = await reader.findAllForOwner('owner-id', {
      skip: 20,
      take: 10,
      state: ProjectLifecycleState.ACTIVE,
      search: '  opus  ',
    });

    const where = {
      ownerId: 'owner-id',
      lifecycleState: 'ACTIVE',
      OR: [
        { title: { contains: 'opus', mode: 'insensitive' } },
        { description: { contains: 'opus', mode: 'insensitive' } },
      ],
    };

    expect(projectModel.findMany).toHaveBeenCalledWith({
      where,
      include: { cycles: { orderBy: { cycleNumber: 'asc' } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: 20,
      take: 10,
    });
    expect(projectModel.count).toHaveBeenCalledWith({ where });
    expect(prisma.$transaction).toHaveBeenCalledWith([
      'find-many-query',
      'count-query',
    ]);
    expect(result.total).toBe(1);
    expect(result.projects[0]?.id).toBe('project-id');
  });

  it('omits the state filter and ignores blank search text', async () => {
    await reader.findAllForOwner('owner-id', {
      skip: 0,
      take: 10,
      search: '   ',
    });

    expect(projectModel.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-id' },
      include: { cycles: { orderBy: { cycleNumber: 'asc' } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: 0,
      take: 10,
    });
  });
});

function rawProject(): PrismaProjectWithCycles {
  const base: PrismaProject = {
    id: 'project-id',
    ownerId: 'owner-id',
    title: 'Build Magnum Opus',
    description: null,
    lifecycleState: 'ACTIVE',
    revision: 1,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  };

  return { ...base, cycles: [] };
}
