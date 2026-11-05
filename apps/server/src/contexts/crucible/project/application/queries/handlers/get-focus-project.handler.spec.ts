import { Project } from '../../../domain/project.aggregate';
import type { ProjectReader } from '../../ports/project-reader.port';
import { GetFocusProjectQuery } from '../get-focus-project.query';
import { GetFocusProjectHandler } from './get-focus-project.handler';

describe('GetFocusProjectHandler', () => {
  const createReader = (
    candidates: Awaited<ReturnType<ProjectReader['findFocusCandidates']>>,
  ) =>
    ({
      findFocusCandidates: jest.fn().mockResolvedValue(candidates),
    }) as unknown as jest.Mocked<ProjectReader>;

  const running = (title: string) => {
    const project = Project.create({ ownerId: 'owner-id', title });
    project.start();
    return project;
  };

  it('reads the owner candidates and returns the chosen one', async () => {
    const quiet = { project: running('Quiet'), lastActivityAt: null };
    const busy = {
      project: running('Busy'),
      lastActivityAt: new Date('2026-11-04T08:00:00Z'),
    };
    const reader = createReader([quiet, busy]);

    const result = await new GetFocusProjectHandler(reader).execute(
      new GetFocusProjectQuery('owner-id'),
    );

    expect(reader.findFocusCandidates).toHaveBeenCalledWith('owner-id');
    expect(result.isSuccess).toBe(true);
    expect(result.unwrap()).toBe(busy);
  });

  it('succeeds with null when nothing is running', async () => {
    const result = await new GetFocusProjectHandler(createReader([])).execute(
      new GetFocusProjectQuery('owner-id'),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.unwrap()).toBeNull();
  });
});
