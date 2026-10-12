import { Result } from '@shared/domain/result';

import { Project } from '../../../domain/project.aggregate';
import type {
  ProjectMutationInput,
  ProjectMutationService,
} from '../../services';
import {
  CompleteProjectCommand,
  PauseProjectCommand,
  ReopenProjectCommand,
  ResumeProjectCommand,
  SetIntendedOutcomeCommand,
  SetTargetEndDateCommand,
  StartProjectCommand,
  StopProjectCommand,
} from '..';
import { CompleteProjectHandler } from './complete-project.handler';
import { PauseProjectHandler } from './pause-project.handler';
import { ReopenProjectHandler } from './reopen-project.handler';
import { ResumeProjectHandler } from './resume-project.handler';
import { SetIntendedOutcomeHandler } from './set-intended-outcome.handler';
import { SetTargetEndDateHandler } from './set-target-end-date.handler';
import { StartProjectHandler } from './start-project.handler';
import { StopProjectHandler } from './stop-project.handler';

/**
 * Every mutating handler delegates to ProjectMutationService (covered by its
 * own spec). Here we check that each one passes the right identity and
 * revision, and that its mutation calls the right aggregate behaviour with
 * the command's arguments.
 */
describe('Project mutation handlers', () => {
  const service = {
    mutate: jest.fn(),
  } as unknown as jest.Mocked<ProjectMutationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service.mutate.mockResolvedValue(Result.ok({} as Project));
  });

  const lastInput = (): ProjectMutationInput =>
    service.mutate.mock.calls.at(-1)![0];

  const aggregateSpy = () =>
    ({
      start: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      stop: jest.fn(),
      complete: jest.fn(),
      reopen: jest.fn(),
      setIntendedOutcome: jest.fn(),
      setTargetEndAt: jest.fn(),
    }) as unknown as jest.Mocked<Project>;

  it.each([
    {
      name: 'Start',
      run: () =>
        new StartProjectHandler(service).execute(
          new StartProjectCommand('project-id', 'owner-id', 2),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.start).toHaveBeenCalledWith(),
    },
    {
      name: 'Pause',
      run: () =>
        new PauseProjectHandler(service).execute(
          new PauseProjectCommand('project-id', 'owner-id', 2),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.pause).toHaveBeenCalledWith(),
    },
    {
      name: 'Resume',
      run: () =>
        new ResumeProjectHandler(service).execute(
          new ResumeProjectCommand('project-id', 'owner-id', 2),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.resume).toHaveBeenCalledWith(),
    },
    {
      name: 'Stop with a closing note',
      run: () =>
        new StopProjectHandler(service).execute(
          new StopProjectCommand('project-id', 'owner-id', 2, 'Đổi hướng'),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.stop).toHaveBeenCalledWith('Đổi hướng'),
    },
    {
      name: 'Stop without a note',
      run: () =>
        new StopProjectHandler(service).execute(
          new StopProjectCommand('project-id', 'owner-id', 2),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.stop).toHaveBeenCalledWith(undefined),
    },
    {
      name: 'Complete with a closing note',
      run: () =>
        new CompleteProjectHandler(service).execute(
          new CompleteProjectCommand('project-id', 'owner-id', 2, 'Xong'),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.complete).toHaveBeenCalledWith('Xong'),
    },
    {
      name: 'Reopen',
      run: () =>
        new ReopenProjectHandler(service).execute(
          new ReopenProjectCommand('project-id', 'owner-id', 2),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.reopen).toHaveBeenCalledWith(),
    },
    {
      name: 'Set intended outcome',
      run: () =>
        new SetIntendedOutcomeHandler(service).execute(
          new SetIntendedOutcomeCommand('project-id', 'owner-id', 2, 'Ship'),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.setIntendedOutcome).toHaveBeenCalledWith('Ship'),
    },
    {
      name: 'Set target end date',
      run: () =>
        new SetTargetEndDateHandler(service).execute(
          new SetTargetEndDateCommand(
            'project-id',
            'owner-id',
            2,
            '2026-09-30',
          ),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.setTargetEndAt).toHaveBeenCalledWith('2026-09-30'),
    },
    {
      name: 'Clear target end date',
      run: () =>
        new SetTargetEndDateHandler(service).execute(
          new SetTargetEndDateCommand('project-id', 'owner-id', 2, null),
        ),
      expectCall: (p: jest.Mocked<Project>) =>
        expect(p.setTargetEndAt).toHaveBeenCalledWith(null),
    },
  ])('$name', async ({ run, expectCall }) => {
    await run();

    const input = lastInput();
    expect(input).toMatchObject({
      projectId: 'project-id',
      ownerId: 'owner-id',
      expectedRevision: 2,
    });

    const project = aggregateSpy();
    input.mutate(project);
    expectCall(project);
  });
});
