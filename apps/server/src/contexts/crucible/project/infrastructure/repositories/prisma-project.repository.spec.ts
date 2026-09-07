import type { Project as PrismaProject } from '@repo/database';

import { Project } from '../../domain/project.aggregate';
import { PrismaProjectWithCycles } from '../mappers/prisma-project.mapper';
import { PrismaProjectRepository } from './prisma-project.repository';

describe('PrismaProjectRepository', () => {
  const transactionClient = {
    project: {
      updateMany: jest.fn(),
    },
    projectCycle: {
      upsert: jest.fn(),
    },
    projectLifecycleTransition: {
      createMany: jest.fn(),
    },
  };

  const projectModel = {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  };

  type TransactionCallback = (
    transaction: typeof transactionClient,
  ) => Promise<unknown>;

  const prisma = {
    project: projectModel,
    $transaction: jest.fn((callback: TransactionCallback) =>
      callback(transactionClient),
    ),
  };

  const repository = new PrismaProjectRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createProject = () =>
    Project.create({ ownerId: 'owner-id', title: 'Build Magnum Opus' });

  describe('create', () => {
    it('persists a freshly created Project with no Cycles, outside a transaction', async () => {
      const project = createProject();

      await repository.create(project);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(projectModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: project.id,
          ownerId: 'owner-id',
          title: 'Build Magnum Opus',
          lifecycleState: 'NOT_STARTED',
          revision: 1,
        }),
      });
    });
  });

  describe('update', () => {
    it('updates the Project row and upserts each Cycle atomically after Start', async () => {
      const project = createProject();
      project.start();

      transactionClient.project.updateMany.mockResolvedValue({ count: 1 });
      transactionClient.projectCycle.upsert.mockResolvedValue({});

      const updated = await repository.update(project, 1);

      expect(updated).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      expect(transactionClient.project.updateMany).toHaveBeenCalledWith({
        where: { id: project.id, ownerId: 'owner-id', revision: 1 },
        data: {
          title: 'Build Magnum Opus',
          description: null,
          lifecycleState: 'ACTIVE',
          revision: 2,
          updatedAt: project.updatedAt,
        },
      });

      const cycle = project.currentCycle!;
      expect(transactionClient.projectCycle.upsert).toHaveBeenCalledTimes(1);
      expect(transactionClient.projectCycle.upsert).toHaveBeenCalledWith({
        where: { id: cycle.id },
        create: {
          id: cycle.id,
          projectId: project.id,
          ownerId: 'owner-id',
          cycleNumber: 1,
          intendedOutcome: null,
          startedAt: cycle.startedAt,
          endedAt: null,
          endReason: null,
        },
        update: {
          intendedOutcome: null,
          endedAt: null,
          endReason: null,
        },
      });

      expect(
        transactionClient.projectLifecycleTransition.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            projectId: project.id,
            cycleId: cycle.id,
            action: 'START',
            fromState: 'NOT_STARTED',
            toState: 'ACTIVE',
            occurredAt: expect.any(Date),
          },
        ],
      });
    });

    it('does not touch Cycles when the revision is stale', async () => {
      const project = createProject();
      project.start();

      transactionClient.project.updateMany.mockResolvedValue({ count: 0 });

      const updated = await repository.update(project, 1);

      expect(updated).toBe(false);
      expect(transactionClient.projectCycle.upsert).not.toHaveBeenCalled();
      expect(
        transactionClient.projectLifecycleTransition.createMany,
      ).not.toHaveBeenCalled();
    });

    it('upserts a closed Cycle by its stable id instead of deleting and recreating it', async () => {
      const project = createProject();
      project.start();
      const cycleId = project.currentCycle!.id;
      project.stop();

      transactionClient.project.updateMany.mockResolvedValue({ count: 1 });
      transactionClient.projectCycle.upsert.mockResolvedValue({});

      await repository.update(project, 2);

      expect(transactionClient.projectCycle.upsert).toHaveBeenCalledWith({
        where: { id: cycleId },
        create: expect.objectContaining({ id: cycleId }),
        update: {
          intendedOutcome: null,
          endedAt: project.cycles[0].endedAt,
          endReason: 'STOPPED',
        },
      });

      expect(
        transactionClient.projectLifecycleTransition.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            projectId: project.id,
            cycleId,
            action: 'START',
            fromState: 'NOT_STARTED',
            toState: 'ACTIVE',
            occurredAt: expect.any(Date),
          },
          {
            projectId: project.id,
            cycleId,
            action: 'STOP',
            fromState: 'ACTIVE',
            toState: 'STOPPED',
            occurredAt: expect.any(Date),
          },
        ],
      });
    });
  });

  describe('findByIdForOwner', () => {
    it('loads an owned Project together with its ordered Cycles', async () => {
      projectModel.findFirst.mockResolvedValue(rawProjectWithCycles());

      const project = await repository.findByIdForOwner(
        'project-id',
        'owner-id',
      );

      expect(projectModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'project-id', ownerId: 'owner-id' },
        include: { cycles: { orderBy: { cycleNumber: 'asc' } } },
      });

      expect(project?.lifecycleState).toBe('ACTIVE');
      expect(project?.cycles).toHaveLength(1);
    });

    it('returns null when no owned Project exists', async () => {
      projectModel.findFirst.mockResolvedValue(null);

      expect(
        await repository.findByIdForOwner('project-id', 'different-owner'),
      ).toBeNull();
    });
  });

  describe('deletePermanently', () => {
    it('deletes the owned Project at the expected revision', async () => {
      projectModel.deleteMany.mockResolvedValue({ count: 1 });

      const deleted = await repository.deletePermanently(
        'project-id',
        'owner-id',
        1,
      );

      expect(deleted).toBe(true);
      expect(projectModel.deleteMany).toHaveBeenCalledWith({
        where: { id: 'project-id', ownerId: 'owner-id', revision: 1 },
      });
    });

    it('returns false when the revision no longer matches', async () => {
      projectModel.deleteMany.mockResolvedValue({ count: 0 });

      expect(
        await repository.deletePermanently('project-id', 'owner-id', 1),
      ).toBe(false);
    });
  });
});

function rawProjectWithCycles(): PrismaProjectWithCycles {
  const base: PrismaProject = {
    id: 'project-id',
    ownerId: 'owner-id',
    title: 'Build Magnum Opus',
    description: null,
    lifecycleState: 'ACTIVE',
    revision: 2,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-21T10:00:00.000Z'),
  };

  return {
    ...base,
    cycles: [
      {
        id: 'cycle-1',
        projectId: 'project-id',
        ownerId: 'owner-id',
        cycleNumber: 1,
        intendedOutcome: null,
        startedAt: new Date('2026-08-20T10:00:00.000Z'),
        endedAt: null,
        endReason: null,
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
        updatedAt: new Date('2026-08-20T10:00:00.000Z'),
      },
    ],
  };
}
