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
});
