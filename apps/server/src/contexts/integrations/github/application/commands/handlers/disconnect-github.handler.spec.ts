import type { GitHubConnectionRepository } from '../../../domain/ports/github-connection.repository';
import { DisconnectGitHubCommand } from '../disconnect-github.command';
import { DisconnectGitHubHandler } from './disconnect-github.handler';

describe('DisconnectGitHubHandler', () => {
  const repository: jest.Mocked<GitHubConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    revokeIfTokenUnchanged: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const handler = new DisconnectGitHubHandler(repository);

  beforeEach(() => jest.clearAllMocks());

  it('removes the connection of the owner', async () => {
    const result = await handler.execute(
      new DisconnectGitHubCommand({ ownerId: 'owner-id' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(repository.deleteByOwner).toHaveBeenCalledWith('owner-id');
  });

  it('succeeds when there was nothing to disconnect', async () => {
    repository.deleteByOwner.mockResolvedValue(undefined);

    const result = await handler.execute(
      new DisconnectGitHubCommand({ ownerId: 'owner-without-connection' }),
    );

    expect(result.isSuccess).toBe(true);
  });
});
