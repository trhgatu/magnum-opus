import {
  GitHubNotConnectedException,
  GitHubRateLimitedException,
  GitHubTokenInvalidException,
  GitHubUnavailableException,
} from '../../../domain/exceptions';
import { GitHubConnection } from '../../../domain/github-connection.entity';
import type { GitHubConnectionRepository } from '../../../domain/ports/github-connection.repository';
import type { Clock } from '../../ports/clock.port';
import type { GitHubApi, GitHubRepository } from '../../ports/github-api.port';
import type { TokenCipher } from '../../ports/token-cipher.port';
import { ListGitHubRepositoriesQuery } from '../list-github-repositories.query';
import { ListGitHubRepositoriesHandler } from './list-github-repositories.handler';

const NOW = new Date('2026-10-16T10:00:00.000Z');

const repository = (
  id: number,
  fullName: string,
  pushedAt: string | null,
): GitHubRepository => ({
  id: String(id),
  fullName,
  isPrivate: false,
  pushedAt: pushedAt ? new Date(pushedAt) : null,
});

describe('ListGitHubRepositoriesHandler', () => {
  const api: jest.Mocked<GitHubApi> = {
    verifyToken: jest.fn(),
    listRepositories: jest.fn(),
  };
  const cipher: jest.Mocked<TokenCipher> = {
    encrypt: jest.fn(),
    decrypt: jest.fn((encrypted: string) => `plain(${encrypted})`),
  };
  const connections: jest.Mocked<GitHubConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const clock: Clock = { now: () => NOW };
  const handler = new ListGitHubRepositoriesHandler(
    api,
    cipher,
    connections,
    clock,
  );

  const connection = (expiresAt: Date | null = null) =>
    GitHubConnection.connect({
      id: 'connection-id',
      ownerId: 'owner-id',
      account: { id: '1', nodeId: 'U_1', login: 'trhgatu' },
      encryptedToken: 'enc-token',
      expiresAt,
      now: new Date('2026-10-01T00:00:00.000Z'),
    });

  const query = (search?: string) =>
    new ListGitHubRepositoriesQuery({ ownerId: 'owner-id', search });

  beforeEach(() => {
    jest.clearAllMocks();
    connections.findByOwner.mockResolvedValue(connection());
    connections.update.mockResolvedValue(true);
  });

  it('lists repositories with the decrypted token, most recently pushed first', async () => {
    api.listRepositories.mockResolvedValue({
      repositories: [
        repository(1, 'trhgatu/old', '2026-01-01T00:00:00Z'),
        repository(2, 'trhgatu/never-pushed', null),
        repository(3, 'trhgatu/magnum-opus', '2026-10-15T00:00:00Z'),
      ],
      complete: true,
    });

    const result = await handler.execute(query());

    expect(api.listRepositories).toHaveBeenCalledWith('plain(enc-token)');
    expect(result.getValue()).toEqual({
      repositories: [
        repository(3, 'trhgatu/magnum-opus', '2026-10-15T00:00:00Z'),
        repository(1, 'trhgatu/old', '2026-01-01T00:00:00Z'),
        repository(2, 'trhgatu/never-pushed', null),
      ],
      truncated: false,
    });
  });

  it('filters by name, ignoring case and surrounding spaces', async () => {
    api.listRepositories.mockResolvedValue({
      repositories: [
        repository(1, 'trhgatu/Magnum-Opus', null),
        repository(2, 'trhgatu/dotfiles', null),
      ],
      complete: true,
    });

    const result = await handler.execute(query('  OPUS '));

    expect(result.getValue().repositories.map((repo) => repo.fullName)).toEqual(
      ['trhgatu/Magnum-Opus'],
    );
  });

  it('treats a blank search as no search', async () => {
    api.listRepositories.mockResolvedValue({
      repositories: [
        repository(1, 'a/one', null),
        repository(2, 'a/two', null),
      ],
      complete: true,
    });

    const result = await handler.execute(query('   '));

    expect(result.getValue().repositories).toHaveLength(2);
  });

  it('returns at most 100 and says more matched', async () => {
    api.listRepositories.mockResolvedValue({
      repositories: Array.from({ length: 101 }, (_, i) =>
        repository(i + 1, `trhgatu/repo-${i + 1}`, null),
      ),
      complete: true,
    });

    const result = await handler.execute(query());

    expect(result.getValue().repositories).toHaveLength(100);
    expect(result.getValue().truncated).toBe(true);
  });

  it('says the list is truncated when GitHub was not read to the end', async () => {
    api.listRepositories.mockResolvedValue({
      repositories: [repository(1, 'trhgatu/one', null)],
      complete: false,
    });

    const result = await handler.execute(query());

    expect(result.getValue().truncated).toBe(true);
  });

  it('refuses when GitHub is not connected', async () => {
    connections.findByOwner.mockResolvedValue(null);

    const result = await handler.execute(query());

    expect(result.getError()).toBeInstanceOf(GitHubNotConnectedException);
    expect(api.listRepositories).not.toHaveBeenCalled();
  });

  it('refuses when the token has expired, without calling GitHub', async () => {
    connections.findByOwner.mockResolvedValue(
      connection(new Date('2026-10-15T00:00:00.000Z')),
    );

    const result = await handler.execute(query());

    expect(result.getError()).toBeInstanceOf(GitHubNotConnectedException);
    expect(api.listRepositories).not.toHaveBeenCalled();
  });

  it('marks the connection revoked when GitHub no longer accepts the token', async () => {
    api.listRepositories.mockRejectedValue(new GitHubTokenInvalidException());

    const result = await handler.execute(query());

    expect(result.getError()).toBeInstanceOf(GitHubNotConnectedException);
    const saved = connections.update.mock.calls[0][0];
    expect(saved.statusAt(NOW)).toBe('REVOKED');
  });

  it.each([
    new GitHubRateLimitedException(30),
    new GitHubUnavailableException(),
  ])('passes %p from GitHub through as a failure', async (error) => {
    api.listRepositories.mockRejectedValue(error);

    const result = await handler.execute(query());

    expect(result.getError()).toBe(error);
    expect(connections.update).not.toHaveBeenCalled();
  });

  it('lets unexpected errors surface instead of turning them into a result', async () => {
    api.listRepositories.mockRejectedValue(new Error('boom'));

    await expect(handler.execute(query())).rejects.toThrow('boom');
  });
});
