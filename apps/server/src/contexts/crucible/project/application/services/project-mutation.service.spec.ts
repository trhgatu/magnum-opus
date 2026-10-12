import {
  InvalidClosingNoteException,
  ProjectNotFoundException,
  ProjectRevisionConflictException,
} from '../../domain/exceptions';
import type { ProjectRepository } from '../../domain/ports/project.repository';
import { Project } from '../../domain/project.aggregate';
import { ProjectMutationService } from './project-mutation.service';

describe('ProjectMutationService', () => {
  const createProject = () =>
    Project.create({ ownerId: 'owner-id', title: 'Learn the piano' });

  const createRepository = (project: Project | null, updated = true) =>
    ({
      findByIdForOwner: jest.fn().mockResolvedValue(project),
      update: jest.fn().mockResolvedValue(updated),
    }) as unknown as jest.Mocked<ProjectRepository>;

  const mutate = (
    repository: ProjectRepository,
    change: (project: Project) => void,
    expectedRevision = 1,
  ) =>
    new ProjectMutationService(repository).mutate({
      projectId: 'project-id',
      ownerId: 'owner-id',
      expectedRevision,
      mutate: change,
    });

  it('applies the change and saves it against the expected revision', async () => {
    const project = createProject();
    const repository = createRepository(project);

    const result = await mutate(repository, (p) => p.start());

    expect(result.isSuccess).toBe(true);
    expect(project.revision).toBe(2);
    expect(repository.update).toHaveBeenCalledWith(project, 1);
  });

  it('fails with not found for a missing or foreign Project', async () => {
    const repository = createRepository(null);

    const result = await mutate(repository, (p) => p.start());

    expect(result.getError()).toBeInstanceOf(ProjectNotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('fails with a conflict before changing anything when the revision is stale', async () => {
    const project = createProject();
    const repository = createRepository(project);
    const change = jest.fn();

    const result = await mutate(repository, change, 7);

    expect(result.getError()).toBeInstanceOf(ProjectRevisionConflictException);
    expect(change).not.toHaveBeenCalled();
  });

  it('turns a domain exception into a failed result without saving', async () => {
    const repository = createRepository(createProject());

    // A note on a never-started Project has no Cycle to attach to.
    const result = await mutate(repository, (p) => p.stop('Ghi chú'));

    expect(result.getError()).toBeInstanceOf(InvalidClosingNoteException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not write when the change is a no-op', async () => {
    const project = createProject();
    project.start();
    project.setIntendedOutcome('Đàn Canon in D');
    const repository = createRepository(project);

    const result = await mutate(
      repository,
      (p) => p.setIntendedOutcome('Đàn Canon in D'),
      project.revision,
    );

    expect(result.isSuccess).toBe(true);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('reports a conflict when another write wins the race', async () => {
    const repository = createRepository(createProject(), false);

    const result = await mutate(repository, (p) => p.start());

    expect(result.getError()).toBeInstanceOf(ProjectRevisionConflictException);
  });
});
