import { UnlinkActivitySourceCommand } from '..';
import { UnlinkActivitySourceHandler } from './unlink-activity-source.handler';

describe('UnlinkActivitySourceHandler', () => {
  const declarations = { read: jest.fn(), exists: jest.fn() };
  const sources = {
    listByProject: jest.fn(),
    findOne: jest.fn(),
    link: jest.fn(),
    unlink: jest.fn(),
  };
  const handler = new UnlinkActivitySourceHandler(declarations, sources);

  const command = () =>
    new UnlinkActivitySourceCommand({
      ownerId: 'owner-id',
      projectId: 'project-id',
      feedId: 'feed-id',
    });

  beforeEach(() => {
    jest.clearAllMocks();
    declarations.exists.mockResolvedValue(true);
    sources.unlink.mockResolvedValue(true);
  });

  it('removes only the link between the project and the feed', async () => {
    const result = await handler.execute(command());

    expect(result.isSuccess).toBe(true);
    expect(sources.unlink).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
      'feed-id',
    );
  });

  it('refuses a project the owner does not have', async () => {
    declarations.exists.mockResolvedValue(false);

    const result = await handler.execute(command());

    expect(result.getError().error.code).toBe('PROJECT_NOT_FOUND');
    expect(sources.unlink).not.toHaveBeenCalled();
  });

  it('reports a feed that is not a source of the project', async () => {
    sources.unlink.mockResolvedValue(false);

    const result = await handler.execute(command());

    expect(result.getError().error.code).toBe('ACTIVITY_SOURCE_NOT_FOUND');
  });
});
