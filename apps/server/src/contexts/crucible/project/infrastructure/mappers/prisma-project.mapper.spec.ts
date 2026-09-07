import {
  Project as PrismaProject,
  ProjectCycle as PrismaProjectCycle,
  ProjectCycleEndReason as PrismaProjectCycleEndReason,
  ProjectLifecycleState as PrismaProjectLifecycleState,
} from '@repo/database';

import { Project } from '../../domain/project.aggregate';
import {
  PrismaProjectMapper,
  PrismaProjectWithCycles,
} from './prisma-project.mapper';

describe('PrismaProjectMapper', () => {
  const createdAt = new Date('2026-08-20T10:00:00.000Z');
  const updatedAt = new Date('2026-08-21T10:00:00.000Z');

  const rawProject: PrismaProject = {
    id: 'project-id',
    ownerId: 'owner-id',
    title: 'Build Magnum Opus',
    description: 'Personal growth app',
    lifecycleState: PrismaProjectLifecycleState.ACTIVE,
    revision: 3,
    createdAt,
    updatedAt,
  };

  const openCycle: PrismaProjectCycle = {
    id: 'cycle-2',
    projectId: 'project-id',
    ownerId: 'owner-id',
    cycleNumber: 2,
    intendedOutcome: 'Ship Projects V1',
    startedAt: new Date('2026-08-21T00:00:00.000Z'),
    endedAt: null,
    endReason: null,
    createdAt,
    updatedAt,
  };

  const closedCycle: PrismaProjectCycle = {
    id: 'cycle-1',
    projectId: 'project-id',
    ownerId: 'owner-id',
    cycleNumber: 1,
    intendedOutcome: null,
    startedAt: new Date('2026-08-01T00:00:00.000Z'),
    endedAt: new Date('2026-08-20T00:00:00.000Z'),
    endReason: PrismaProjectCycleEndReason.STOPPED,
    createdAt,
    updatedAt,
  };

  it('maps a Prisma record with its Cycles back to the domain aggregate, ordered by cycleNumber', () => {
    const raw: PrismaProjectWithCycles = {
      ...rawProject,
      cycles: [openCycle, closedCycle],
    };

    const project = PrismaProjectMapper.toDomain(raw);

    expect(project.toPrimitives()).toEqual({
      id: 'project-id',
      ownerId: 'owner-id',
      title: 'Build Magnum Opus',
      description: 'Personal growth app',
      lifecycleState: 'ACTIVE',
      revision: 3,
      createdAt,
      updatedAt,
    });

    expect(project.cycles.map((cycle) => cycle.cycleNumber)).toEqual([1, 2]);
    expect(project.cycles[0].endReason).toBe('STOPPED');
    expect(project.currentCycle?.id).toBe('cycle-2');
    expect(project.currentCycle?.intendedOutcome).toBe('Ship Projects V1');
  });

  it('maps a Project with no Cycles yet', () => {
    const raw: PrismaProjectWithCycles = { ...rawProject, cycles: [] };

    const project = PrismaProjectMapper.toDomain(raw);

    expect(project.cycles).toHaveLength(0);
    expect(project.currentCycle).toBeNull();
  });

  it('maps the domain aggregate back to persistence shape for both tables', () => {
    const raw: PrismaProjectWithCycles = {
      ...rawProject,
      cycles: [openCycle, closedCycle],
    };
    const project = PrismaProjectMapper.toDomain(raw);

    const persistence = PrismaProjectMapper.toPersistence(project);

    expect(persistence.project).toEqual(rawProject);
    expect(persistence.cycles).toEqual([
      {
        id: 'cycle-1',
        projectId: 'project-id',
        ownerId: 'owner-id',
        cycleNumber: 1,
        intendedOutcome: null,
        startedAt: closedCycle.startedAt,
        endedAt: closedCycle.endedAt,
        endReason: 'STOPPED',
      },
      {
        id: 'cycle-2',
        projectId: 'project-id',
        ownerId: 'owner-id',
        cycleNumber: 2,
        intendedOutcome: 'Ship Projects V1',
        startedAt: openCycle.startedAt,
        endedAt: null,
        endReason: null,
      },
    ]);
  });

  it('round-trips a freshly created Project with no Cycles', () => {
    const project = Project.create({
      ownerId: 'owner-id',
      title: 'New project',
    });

    const persistence = PrismaProjectMapper.toPersistence(project);

    expect(persistence.project.lifecycleState).toBe('NOT_STARTED');
    expect(persistence.cycles).toEqual([]);
  });
});
