import {
  Project as PrismaProject,
  ProjectCycleEndReason as PrismaProjectCycleEndReason,
  ProjectLifecycleState as PrismaProjectLifecycleState,
} from '@repo/database';

import { Project } from '../../domain/project.aggregate';
import {
  PrismaProjectCycleWithEntries,
  PrismaProjectMapper,
  PrismaProjectWithCycles,
} from './prisma-project.mapper';

describe('PrismaProjectMapper', () => {
  const createdAt = new Date('2026-08-20T10:00:00.000Z');
  const updatedAt = new Date('2026-08-21T10:00:00.000Z');
  const firstSet = new Date('2026-08-21T02:00:00.000Z');
  const secondSet = new Date('2026-08-25T02:00:00.000Z');

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

  const openCycle: PrismaProjectCycleWithEntries = {
    id: 'cycle-2',
    projectId: 'project-id',
    ownerId: 'owner-id',
    cycleNumber: 2,
    intendedOutcome: 'Ship Projects V1.1',
    startedAt: new Date('2026-08-21T00:00:00.000Z'),
    endedAt: null,
    endReason: null,
    closingNote: null,
    // @db.Date comes back from Prisma as midnight UTC.
    targetEndAt: new Date('2026-09-30T00:00:00.000Z'),
    createdAt,
    updatedAt,
    // Deliberately out of order: the mapper must sort by sequence.
    outcomeEntries: [
      {
        id: 'entry-2',
        cycleId: 'cycle-2',
        sequence: 2,
        outcome: 'Ship Projects V1.1',
        setAt: secondSet,
        createdAt,
      },
      {
        id: 'entry-1',
        cycleId: 'cycle-2',
        sequence: 1,
        outcome: 'Ship Projects V1',
        setAt: firstSet,
        createdAt,
      },
    ],
  };

  const closedCycle: PrismaProjectCycleWithEntries = {
    id: 'cycle-1',
    projectId: 'project-id',
    ownerId: 'owner-id',
    cycleNumber: 1,
    intendedOutcome: null,
    startedAt: new Date('2026-08-01T00:00:00.000Z'),
    endedAt: new Date('2026-08-20T00:00:00.000Z'),
    endReason: PrismaProjectCycleEndReason.STOPPED,
    closingNote: 'Đổi hướng',
    targetEndAt: null,
    createdAt,
    updatedAt,
    outcomeEntries: [],
  };

  const raw = (): PrismaProjectWithCycles => ({
    ...rawProject,
    cycles: [openCycle, closedCycle],
  });

  it('maps a Prisma record with its Cycles back to the domain aggregate, ordered by cycleNumber', () => {
    const project = PrismaProjectMapper.toDomain(raw());

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
  });

  it('maps the outcome history in sequence order and the current outcome', () => {
    const cycle = PrismaProjectMapper.toDomain(raw()).currentCycle!;

    expect(cycle.outcomeHistory).toEqual([
      { sequence: 1, outcome: 'Ship Projects V1', setAt: firstSet },
      { sequence: 2, outcome: 'Ship Projects V1.1', setAt: secondSet },
    ]);
    expect(cycle.intendedOutcome).toBe('Ship Projects V1.1');
  });

  it('maps the closing note and the date-only target end date', () => {
    const project = PrismaProjectMapper.toDomain(raw());

    expect(project.cycles[0].closingNote).toBe('Đổi hướng');
    expect(project.currentCycle?.targetEndAt).toBe('2026-09-30');
  });

  it('reads the outcome only from its history, never the old column', () => {
    // intended_outcome is about to be dropped; whatever is left in it is
    // ignored.
    const project = PrismaProjectMapper.toDomain({
      ...rawProject,
      cycles: [
        { ...openCycle, intendedOutcome: 'Left in the old column' },
        { ...closedCycle, intendedOutcome: 'Also left behind' },
      ],
    });

    expect(project.currentCycle?.outcomeHistory).toEqual([
      { sequence: 1, outcome: 'Ship Projects V1', setAt: firstSet },
      { sequence: 2, outcome: 'Ship Projects V1.1', setAt: secondSet },
    ]);
    expect(project.cycles[0].outcomeHistory).toEqual([]);
    expect(project.cycles[0].intendedOutcome).toBeNull();
  });

  it('maps a Project with no Cycles yet', () => {
    const project = PrismaProjectMapper.toDomain({ ...rawProject, cycles: [] });

    expect(project.cycles).toHaveLength(0);
    expect(project.currentCycle).toBeNull();
  });

  it('maps the domain aggregate back to persistence shape for every table', () => {
    const project = PrismaProjectMapper.toDomain(raw());

    const persistence = PrismaProjectMapper.toPersistence(project);

    expect(persistence.project).toEqual(rawProject);
    expect(persistence.cycles).toEqual([
      {
        id: 'cycle-1',
        projectId: 'project-id',
        ownerId: 'owner-id',
        cycleNumber: 1,
        startedAt: closedCycle.startedAt,
        endedAt: closedCycle.endedAt,
        endReason: 'STOPPED',
        closingNote: 'Đổi hướng',
        targetEndAt: null,
      },
      {
        id: 'cycle-2',
        projectId: 'project-id',
        ownerId: 'owner-id',
        cycleNumber: 2,
        startedAt: openCycle.startedAt,
        endedAt: null,
        endReason: null,
        closingNote: null,
        targetEndAt: new Date('2026-09-30T00:00:00.000Z'),
      },
    ]);
    expect(persistence.outcomeEntries).toEqual([
      {
        cycleId: 'cycle-2',
        sequence: 1,
        outcome: 'Ship Projects V1',
        setAt: firstSet,
      },
      {
        cycleId: 'cycle-2',
        sequence: 2,
        outcome: 'Ship Projects V1.1',
        setAt: secondSet,
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
    expect(persistence.outcomeEntries).toEqual([]);
  });

  it('includes cycles and their entries in order when reading', () => {
    expect(PrismaProjectMapper.include).toEqual({
      cycles: {
        orderBy: { cycleNumber: 'asc' },
        include: { outcomeEntries: { orderBy: { sequence: 'asc' } } },
      },
    });
  });
});
