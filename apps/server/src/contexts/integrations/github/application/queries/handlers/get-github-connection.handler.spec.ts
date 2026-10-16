import type { GitHubConnectionRepository } from '../../../domain/ports/github-connection.repository';
import { GitHubConnection } from '../../../domain/github-connection.entity';
import { GetGitHubConnectionQuery } from '../get-github-connection.query';
import { GetGitHubConnectionHandler } from './get-github-connection.handler';

describe('GetGitHubConnectionHandler', () => {
  const repository: jest.Mocked<GitHubConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const handler = new GetGitHubConnectionHandler(repository);

  it('returns the connection of the owner', async () => {
    const connection = GitHubConnection.connect({
      id: 'connection-id',
      ownerId: 'owner-id',
      account: { id: '1', nodeId: 'U_1', login: 'trhgatu' },
      encryptedToken: 'enc',
      expiresAt: null,
      now: new Date('2026-10-16T00:00:00.000Z'),
    });
    repository.findByOwner.mockResolvedValue(connection);

    const result = await handler.execute(
      new GetGitHubConnectionQuery({ ownerId: 'owner-id' }),
    );

    expect(repository.findByOwner).toHaveBeenCalledWith('owner-id');
    expect(result.getValue()).toBe(connection);
  });

  it('returns null when the owner has not connected GitHub', async () => {
    repository.findByOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetGitHubConnectionQuery({ ownerId: 'owner-id' }),
    );

    expect(result.getValue()).toBeNull();
  });
});
