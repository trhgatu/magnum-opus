import { createHash } from 'node:crypto';

import { ActivitySourceError } from '@shared/application/activity';

import type { Clock } from '../application/ports/clock.port';
import type {
  GitHubActivityApi,
  GitHubCommit,
  GitHubPullRequest,
} from '../application/ports/github-activity-api.port';
import type { GitHubApi } from '../application/ports/github-api.port';
import type { TokenCipher } from '../application/ports/token-cipher.port';
import {
  GitHubRateLimitedException,
  GitHubRepositoryNotAccessibleException,
  GitHubTokenInvalidException,
  GitHubUnavailableException,
} from '../domain/exceptions';
import { GitHubConnection } from '../domain/github-connection.entity';
import type { GitHubConnectionRepository } from '../domain/ports/github-connection.repository';
import { GitHubActivityProvider } from './github-activity.provider';

const NOW = new Date('2026-10-16T10:00:00.000Z');
const FROM = new Date('2026-10-01T00:00:00.000Z');
const TO = new Date('2026-10-16T00:00:00.000Z');
const ME = { id: '127409189', nodeId: 'U_kgDOB5gcJQ', login: 'trhgatu' };

const commit = (overrides: Partial<GitHubCommit> = {}): GitHubCommit => ({
  oid: 'a1',
  authoredAt: new Date('2026-10-05T04:38:41.000Z'),
  message: 'feat: add activity',
  parentCount: 1,
  authorAccountId: ME.id,
  ...overrides,
});

const pullRequest = (
  overrides: Partial<GitHubPullRequest> = {},
): GitHubPullRequest => ({
  number: 162,
  createdAt: new Date('2026-10-10T00:00:00.000Z'),
  mergedAt: null,
  updatedAt: new Date('2026-10-10T00:00:00.000Z'),
  authorAccountId: ME.id,
  ...overrides,
});

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('GitHubActivityProvider', () => {
  const connections: jest.Mocked<GitHubConnectionRepository> = {
    findByOwner: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    revokeIfTokenUnchanged: jest.fn(),
    deleteByOwner: jest.fn(),
  };
  const cipher: jest.Mocked<TokenCipher> = {
    encrypt: jest.fn(),
    decrypt: jest.fn((encrypted: string) => `plain(${encrypted})`),
  };
  const gitHubApi: jest.Mocked<GitHubApi> = {
    verifyToken: jest.fn(),
    listRepositories: jest.fn(),
    findRepository: jest.fn(),
  };
  const activityApi: jest.Mocked<GitHubActivityApi> = {
    listCommits: jest.fn(),
    listPullRequests: jest.fn(),
  };
  const clock: Clock = { now: () => NOW };
  const provider = new GitHubActivityProvider(
    connections,
    cipher,
    gitHubApi,
    activityApi,
    clock,
  );

  const connection = (expiresAt: Date | null = null) =>
    GitHubConnection.connect({
      id: 'connection-id',
      ownerId: 'owner-id',
      account: ME,
      encryptedToken: 'enc-token',
      expiresAt,
      now: new Date('2026-09-01T00:00:00.000Z'),
    });

  const resource = {
    ownerId: 'owner-id',
    externalAccountId: ME.id,
    externalResourceId: '1067270000',
  };

  const fetch = () => provider.fetchEvents(resource, FROM, TO);

  /** Lỗi ActivitySourceError mà fetch ném ra. */
  const failure = async () => {
    const error = await fetch().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ActivitySourceError);
    return error as ActivitySourceError;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    connections.findByOwner.mockResolvedValue(connection());
    gitHubApi.findRepository.mockResolvedValue({
      nodeId: 'R_kgDOPeQ8cA',
      fullName: 'trhgatu/magnum-opus',
    });
    activityApi.listCommits.mockResolvedValue([]);
    activityApi.listPullRequests.mockResolvedValue([]);
  });

  it('describes itself as GitHub, with no limit on how far back it reads', () => {
    expect(provider.provider).toBe('GITHUB');
    expect(provider.capabilities).toEqual({ historyWindowDays: null });
  });

  it('reads the repository by its id, as the connected account, over the window', async () => {
    const result = await fetch();

    expect(gitHubApi.findRepository).toHaveBeenCalledWith(
      'plain(enc-token)',
      '1067270000',
    );
    expect(activityApi.listCommits).toHaveBeenCalledWith('plain(enc-token)', {
      repositoryNodeId: 'R_kgDOPeQ8cA',
      authorNodeId: ME.nodeId,
      since: FROM,
      until: TO,
    });
    expect(activityApi.listPullRequests).toHaveBeenCalledWith(
      'plain(enc-token)',
      { repositoryNodeId: 'R_kgDOPeQ8cA', updatedSince: FROM },
    );
    expect(result.displayName).toBe('trhgatu/magnum-opus');
  });

  describe('commits', () => {
    it('records a commit at its author date, keyed by author date and message', async () => {
      activityApi.listCommits.mockResolvedValue([commit()]);

      const { events } = await fetch();

      expect(events).toEqual([
        {
          kind: 'COMMIT_AUTHORED',
          occurredAt: new Date('2026-10-05T04:38:41.000Z'),
          quantity: 1,
          dedupeKey: sha256('2026-10-05T04:38:41.000Z\nfeat: add activity'),
        },
      ]);
    });

    it('never stores the commit message itself', async () => {
      activityApi.listCommits.mockResolvedValue([
        commit({ message: 'secret-plan: launch on friday' }),
      ]);

      const { events } = await fetch();

      expect(JSON.stringify(events)).not.toContain('secret-plan');
    });

    it('counts a rebased copy of a commit once', async () => {
      // Rebase: SHA mới, cùng author date và message.
      activityApi.listCommits.mockResolvedValue([
        commit({ oid: 'a1' }),
        commit({ oid: 'f9' }),
      ]);

      const { events } = await fetch();

      expect(events).toHaveLength(1);
    });

    it('drops merge commits — PR_MERGED already stands for them', async () => {
      activityApi.listCommits.mockResolvedValue([commit({ parentCount: 2 })]);

      expect((await fetch()).events).toEqual([]);
    });

    it('drops commits GitHub could not link to the account, or by someone else', async () => {
      activityApi.listCommits.mockResolvedValue([
        commit({ oid: 'a1', authorAccountId: null }),
        commit({ oid: 'b2', message: 'other', authorAccountId: '555' }),
      ]);

      expect((await fetch()).events).toEqual([]);
    });

    it('keeps a late commit at its own author date, even before the window', async () => {
      // Viết 30/09, amend rồi push 02/10: GitHub trả nó cho khoảng theo
      // committer date, nhưng sự kiện vẫn mang author date 30/09.
      const late = new Date('2026-09-30T23:59:59Z');
      activityApi.listCommits.mockResolvedValue([
        commit({ message: 'late', authoredAt: late }),
        commit({ message: 'on time', authoredAt: FROM }),
      ]);

      const { events } = await fetch();

      expect(events.map((event) => event.occurredAt)).toEqual([late, FROM]);
    });
  });

  describe('pull requests', () => {
    it('records opening and merging of a pull request the user opened', async () => {
      activityApi.listPullRequests.mockResolvedValue([
        pullRequest({
          createdAt: new Date('2026-10-10T00:00:00Z'),
          mergedAt: new Date('2026-10-12T00:00:00Z'),
        }),
      ]);

      const { events } = await fetch();

      expect(events).toEqual([
        {
          kind: 'PR_OPENED',
          occurredAt: new Date('2026-10-10T00:00:00Z'),
          quantity: 1,
          dedupeKey: '162',
        },
        {
          kind: 'PR_MERGED',
          occurredAt: new Date('2026-10-12T00:00:00Z'),
          quantity: 1,
          dedupeKey: '162',
        },
      ]);
    });

    it('records only the merge when the pull request was opened before the window', async () => {
      activityApi.listPullRequests.mockResolvedValue([
        pullRequest({
          createdAt: new Date('2026-09-20T00:00:00Z'),
          mergedAt: new Date('2026-10-12T00:00:00Z'),
        }),
      ]);

      const { events } = await fetch();

      expect(events.map((event) => event.kind)).toEqual(['PR_MERGED']);
    });

    it('ignores pull requests opened by bots or other people', async () => {
      activityApi.listPullRequests.mockResolvedValue([
        pullRequest({ number: 160, authorAccountId: null }),
        pullRequest({ number: 161, authorAccountId: '555' }),
      ]);

      expect((await fetch()).events).toEqual([]);
    });
  });

  describe('when the source cannot be read', () => {
    it('reports GITHUB_NOT_CONNECTED without a connection', async () => {
      connections.findByOwner.mockResolvedValue(null);

      expect((await failure()).code).toBe('GITHUB_NOT_CONNECTED');
      expect(gitHubApi.findRepository).not.toHaveBeenCalled();
    });

    it('reports GITHUB_TOKEN_EXPIRED once the token has expired', async () => {
      connections.findByOwner.mockResolvedValue(
        connection(new Date('2026-10-15T00:00:00.000Z')),
      );

      expect((await failure()).code).toBe('GITHUB_TOKEN_EXPIRED');
      expect(gitHubApi.findRepository).not.toHaveBeenCalled();
    });

    it('reports GITHUB_TOKEN_REVOKED for a connection already revoked', async () => {
      connections.findByOwner.mockResolvedValue(
        GitHubConnection.rehydrate({
          ...connection().toSnapshot(),
          status: 'REVOKED',
        }),
      );

      expect((await failure()).code).toBe('GITHUB_TOKEN_REVOKED');
    });

    it('reports GITHUB_ACCOUNT_CHANGED when the feed belongs to another account', async () => {
      const error = await provider
        .fetchEvents({ ...resource, externalAccountId: '555' }, FROM, TO)
        .catch((e: unknown) => e);

      expect((error as ActivitySourceError).code).toBe(
        'GITHUB_ACCOUNT_CHANGED',
      );
      expect(gitHubApi.findRepository).not.toHaveBeenCalled();
    });

    it('revokes the connection when GitHub no longer accepts the token', async () => {
      activityApi.listCommits.mockRejectedValue(
        new GitHubTokenInvalidException(),
      );

      expect((await failure()).code).toBe('GITHUB_TOKEN_REVOKED');
      expect(connections.revokeIfTokenUnchanged).toHaveBeenCalledWith(
        'owner-id',
        'enc-token',
      );
    });

    it.each([
      [
        new GitHubRepositoryNotAccessibleException(),
        'GITHUB_REPOSITORY_NOT_ACCESSIBLE',
      ],
      [new GitHubUnavailableException(), 'GITHUB_UNAVAILABLE'],
    ])('maps %p to %s', async (error, code) => {
      gitHubApi.findRepository.mockRejectedValue(error);

      const result = await failure();

      expect(result.code).toBe(code);
      expect(result.retryAfterSeconds).toBeNull();
    });

    it('keeps the seconds to wait when GitHub is rate limiting', async () => {
      activityApi.listPullRequests.mockRejectedValue(
        new GitHubRateLimitedException(120),
      );

      const result = await failure();

      expect(result.code).toBe('GITHUB_RATE_LIMITED');
      expect(result.retryAfterSeconds).toBe(120);
    });

    it('lets unexpected errors surface unchanged', async () => {
      activityApi.listCommits.mockRejectedValue(new Error('boom'));

      await expect(fetch()).rejects.toThrow('boom');
    });
  });
});
