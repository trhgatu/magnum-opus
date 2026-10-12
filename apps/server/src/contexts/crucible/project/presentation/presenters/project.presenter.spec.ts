import { ProjectLifecycleState } from '../../domain/enums';
import { Project } from '../../domain/project.aggregate';
import { ProjectId } from '../../domain/value-objects';
import { ProjectPresenter } from './project.presenter';

describe('ProjectPresenter', () => {
  it('returns currentCycle as null when the Project has never been started', () => {
    const project = Project.rehydrate({
      id: new ProjectId('project-id'),
      ownerId: 'owner-id',
      title: 'Build Magnum Opus',
      description: null,
      lifecycleState: ProjectLifecycleState.NOT_STARTED,
      revision: 1,
      cycles: [],
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-20T10:00:00.000Z'),
    });

    expect(ProjectPresenter.toResponse(project)).toEqual({
      id: 'project-id',
      title: 'Build Magnum Opus',
      description: null,
      lifecycleState: 'NOT_STARTED',
      currentCycle: null,
      revision: 1,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    });
  });

  it('presents the open current Cycle with its intended outcome', () => {
    const project = Project.rehydrate({
      id: new ProjectId('project-id'),
      ownerId: 'owner-id',
      title: 'Build Magnum Opus',
      description: 'A deliberate effort',
      lifecycleState: ProjectLifecycleState.NOT_STARTED,
      revision: 1,
      cycles: [],
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
    });
    project.start();
    project.setIntendedOutcome('Ship Projects V1');

    const response = ProjectPresenter.toResponse(project);

    expect(response.lifecycleState).toBe('ACTIVE');
    expect(response.currentCycle).toMatchObject({
      cycleNumber: 1,
      intendedOutcome: 'Ship Projects V1',
      endedAt: null,
      endReason: null,
    });
  });

  it('presents currentCycle as null after the Cycle closes on Complete', () => {
    const project = Project.rehydrate({
      id: new ProjectId('project-id'),
      ownerId: 'owner-id',
      title: 'Build Magnum Opus',
      description: null,
      lifecycleState: ProjectLifecycleState.NOT_STARTED,
      revision: 1,
      cycles: [],
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-20T10:00:00.000Z'),
    });
    project.start();
    project.complete();

    const response = ProjectPresenter.toResponse(project);

    expect(response.lifecycleState).toBe('COMPLETED');
    expect(response.currentCycle).toBeNull();
  });

  // V1.1 — API contract §3
  describe('V1.1 cycle fields', () => {
    const startedProject = () => {
      const project = Project.rehydrate({
        id: new ProjectId('project-id'),
        ownerId: 'owner-id',
        title: 'Learn the piano',
        description: null,
        lifecycleState: ProjectLifecycleState.NOT_STARTED,
        revision: 1,
        cycles: [],
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
        updatedAt: new Date('2026-08-20T10:00:00.000Z'),
      });
      project.start();
      return project;
    };

    it('presents the outcome history, target end date and an empty closing note', () => {
      const project = startedProject();
      project.setIntendedOutcome('Đàn Canon in D');
      project.setIntendedOutcome('Đàn Für Elise rút gọn');
      project.setTargetEndAt('2026-09-30');

      const cycle = ProjectPresenter.toResponse(project).currentCycle!;

      expect(cycle.outcomeHistory).toEqual([
        { outcome: 'Đàn Canon in D', setAt: expect.any(String) },
        { outcome: 'Đàn Für Elise rút gọn', setAt: expect.any(String) },
      ]);
      expect(Number.isNaN(Date.parse(cycle.outcomeHistory[0].setAt))).toBe(
        false,
      );
      // Kept for V1 clients: the latest entry.
      expect(cycle.intendedOutcome).toBe('Đàn Für Elise rút gọn');
      expect(cycle.targetEndAt).toBe('2026-09-30');
      expect(cycle.closingNote).toBeNull();
    });

    it('presents an empty history for a Cycle without an outcome', () => {
      const cycle = ProjectPresenter.toResponse(startedProject()).currentCycle!;

      expect(cycle.outcomeHistory).toEqual([]);
      expect(cycle.intendedOutcome).toBeNull();
      expect(cycle.targetEndAt).toBeNull();
    });

    it('lists only closed Cycles, newest first, with their full history', () => {
      const project = startedProject();
      project.setIntendedOutcome('A');
      project.setTargetEndAt('2026-08-31');
      project.stop('Đổi hướng');
      project.reopen();
      project.setIntendedOutcome('B');
      project.complete('Xong');
      project.reopen();

      const closed = ProjectPresenter.toClosedCycles(project);

      expect(closed.map((cycle) => cycle.cycleNumber)).toEqual([2, 1]);
      expect(closed[1]).toMatchObject({
        cycleNumber: 1,
        endReason: 'STOPPED',
        closingNote: 'Đổi hướng',
        targetEndAt: '2026-08-31',
        intendedOutcome: 'A',
        outcomeHistory: [{ outcome: 'A', setAt: expect.any(String) }],
      });
      expect(closed[0]).toMatchObject({
        endReason: 'COMPLETED',
        closingNote: 'Xong',
      });
      expect(closed.every((cycle) => cycle.endedAt !== null)).toBe(true);
    });

    it('returns an empty list when no Cycle has closed yet', () => {
      expect(ProjectPresenter.toClosedCycles(startedProject())).toEqual([]);
    });
  });
});
