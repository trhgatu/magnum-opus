import { Result } from '@shared/domain/result';

import {
  CompleteProjectCommand,
  CreateProjectCommand,
  DeleteProjectCommand,
  PauseProjectCommand,
  ReopenProjectCommand,
  ResumeProjectCommand,
  SetIntendedOutcomeCommand,
  StartProjectCommand,
  StopProjectCommand,
  UpdateProjectCommand,
} from '../../application/commands';
import { GetProjectQuery, GetProjectsQuery } from '../../application/queries';
import { ProjectLifecycleState } from '../../domain/enums';
import { Project } from '../../domain/project.aggregate';
import { ProjectId } from '../../domain/value-objects';
import { ProjectController } from './project.controller';

describe('ProjectController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new ProjectController(
    commandBus as never,
    queryBus as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a Project for the authenticated owner, not an owner from input', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    const response = await controller.create('owner-id', {
      title: 'Build Magnum Opus',
      description: 'A deliberate effort',
    });

    const command = commandBus.execute.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(CreateProjectCommand);
    expect(command).toMatchObject({
      ownerId: 'owner-id',
      title: 'Build Magnum Opus',
      description: 'A deliberate effort',
    });
    expect(response.id).toBe('project-id');
    expect(response.lifecycleState).toBe('NOT_STARTED');
  });

  it('maps list query filters to GetProjectsQuery and returns pagination metadata', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({ projects: [createProject()], total: 1 }),
    );

    const response = await controller.findAll('owner-id', {
      page: 2,
      limit: 10,
      search: 'magnum',
      state: 'ACTIVE',
    } as never);

    const query = queryBus.execute.mock.calls[0]?.[0];
    expect(query).toBeInstanceOf(GetProjectsQuery);
    expect(query).toMatchObject({
      ownerId: 'owner-id',
      page: 2,
      limit: 10,
      search: 'magnum',
      state: 'ACTIVE',
    });
    expect(response.meta).toEqual({
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 2,
    });
  });

  it('gets one owned Project by id', async () => {
    queryBus.execute.mockResolvedValue(Result.ok(createProject()));

    const response = await controller.findOne('owner-id', 'project-id');

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetProjectQuery('project-id', 'owner-id'),
    );
    expect(response.id).toBe('project-id');
  });

  it('sends the expected revision when updating Project information', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.update('owner-id', 'project-id', {
      expectedRevision: 1,
      title: 'Renamed',
      description: null,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateProjectCommand('project-id', 'owner-id', 1, 'Renamed', null),
    );
  });

  it('starts a Project with the expected revision', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.start('owner-id', 'project-id', { expectedRevision: 1 });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new StartProjectCommand('project-id', 'owner-id', 1),
    );
  });

  it('pauses a Project with the expected revision', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.pause('owner-id', 'project-id', { expectedRevision: 2 });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new PauseProjectCommand('project-id', 'owner-id', 2),
    );
  });

  it('resumes a Project with the expected revision', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.resume('owner-id', 'project-id', { expectedRevision: 3 });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new ResumeProjectCommand('project-id', 'owner-id', 3),
    );
  });

  it('stops a Project with the expected revision', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.stop('owner-id', 'project-id', { expectedRevision: 2 });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new StopProjectCommand('project-id', 'owner-id', 2),
    );
  });

  it('completes a Project with the expected revision', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.complete('owner-id', 'project-id', {
      expectedRevision: 2,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new CompleteProjectCommand('project-id', 'owner-id', 2),
    );
  });

  it('reopens a Project with the expected revision', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.reopen('owner-id', 'project-id', {
      expectedRevision: 5,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new ReopenProjectCommand('project-id', 'owner-id', 5),
    );
  });

  it('sets the intended outcome of the current Cycle', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createProject()));

    await controller.setIntendedOutcome('owner-id', 'project-id', {
      expectedRevision: 2,
      intendedOutcome: 'Ship Projects V1',
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new SetIntendedOutcomeCommand(
        'project-id',
        'owner-id',
        2,
        'Ship Projects V1',
      ),
    );
  });

  it('deletes a Project using the query-param expected revision, returning no body', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.delete('owner-id', 'project-id', {
      expectedRevision: 1,
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new DeleteProjectCommand('project-id', 'owner-id', 1),
    );
    expect(response).toBeUndefined();
  });
});

function createProject(): Project {
  return Project.rehydrate({
    id: new ProjectId('project-id'),
    ownerId: 'owner-id',
    title: 'Build Magnum Opus',
    description: 'A deliberate effort',
    lifecycleState: ProjectLifecycleState.NOT_STARTED,
    revision: 1,
    cycles: [],
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  });
}
