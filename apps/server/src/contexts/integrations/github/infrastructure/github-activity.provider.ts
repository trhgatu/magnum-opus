import { createHash } from 'node:crypto';

import type { ActivitySourceErrorCode } from '@repo/contracts';

import {
  type ActivityEventInput,
  type ActivityProviderPort,
  type ActivityResourceRef,
  ActivitySourceError,
  type FetchedActivity,
} from '@shared/application/activity';

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
import type { GitHubConnection } from '../domain/github-connection.entity';
import type { GitHubConnectionRepository } from '../domain/ports/github-connection.repository';

/**
 * Nguồn hoạt động GitHub cho tầng activity: đọc commit và pull request của
 * một repository, chỉ giữ công việc của chính người dùng.
 */
export class GitHubActivityProvider implements ActivityProviderPort {
  readonly provider = 'GITHUB' as const;
  readonly capabilities = { historyWindowDays: null };

  constructor(
    private readonly connections: GitHubConnectionRepository,
    private readonly cipher: TokenCipher,
    private readonly gitHubApi: GitHubApi,
    private readonly activityApi: GitHubActivityApi,
    private readonly clock: Clock,
  ) {}

  async fetchEvents(
    resource: ActivityResourceRef,
    from: Date,
    to: Date,
  ): Promise<FetchedActivity> {
    const connection = await this.usableConnection(resource);

    try {
      return await this.read(connection, resource.externalResourceId, from, to);
    } catch (error) {
      if (error instanceof GitHubTokenInvalidException) {
        await this.connections.revokeIfTokenUnchanged(
          connection.ownerId,
          connection.encryptedToken,
        );
        throw new ActivitySourceError('GITHUB_TOKEN_REVOKED');
      }
      if (error instanceof GitHubRateLimitedException) {
        const { retryAfter } = error.args as { retryAfter: number };
        throw new ActivitySourceError('GITHUB_RATE_LIMITED', retryAfter);
      }
      if (error instanceof GitHubRepositoryNotAccessibleException) {
        throw new ActivitySourceError('GITHUB_REPOSITORY_NOT_ACCESSIBLE');
      }
      if (error instanceof GitHubUnavailableException) {
        throw new ActivitySourceError('GITHUB_UNAVAILABLE');
      }
      throw error;
    }
  }
  /** Kết nối còn dùng được, đúng tài khoản của feed — chưa gọi GitHub. */
  private async usableConnection(
    resource: ActivityResourceRef,
  ): Promise<GitHubConnection> {
    const connection = await this.connections.findByOwner(resource.ownerId);
    if (!connection) throw new ActivitySourceError('GITHUB_NOT_CONNECTED');

    const status = connection.statusAt(this.clock.now());

    if (status !== 'ACTIVE') {
      const code: ActivitySourceErrorCode =
        status === 'EXPIRED' ? 'GITHUB_TOKEN_EXPIRED' : 'GITHUB_TOKEN_REVOKED';
      throw new ActivitySourceError(code);
    }

    // Feed thuộc tài khoản cũ: không chép commit của tài khoản mới vào sổ cũ.
    if (connection.account.id !== resource.externalAccountId) {
      throw new ActivitySourceError('GITHUB_ACCOUNT_CHANGED');
    }
    return connection;
  }

  private async read(
    connection: GitHubConnection,
    repositoryId: string,
    from: Date,
    to: Date,
  ): Promise<FetchedActivity> {
    const token = this.cipher.decrypt(connection.encryptedToken);
    const repository = await this.gitHubApi.findRepository(token, repositoryId);

    const commits = await this.activityApi.listCommits(token, {
      repositoryNodeId: repository.nodeId,
      authorNodeId: connection.account.nodeId,
      since: from,
      until: to,
    });
    const pullRequests = await this.activityApi.listPullRequests(token, {
      repositoryNodeId: repository.nodeId,
      updatedSince: from,
    });

    const accountId = connection.account.id;
    const within = (date: Date) => date >= from && date < to;

    return {
      displayName: repository.fullName,
      events: [
        ...commitEvents(commits, accountId),
        ...pullRequestEvents(pullRequests, accountId, within),
      ],
    };
  }
}
function commitEvents(
  commits: GitHubCommit[],
  accountId: string,
): ActivityEventInput[] {
  const events = new Map<string, ActivityEventInput>();

  for (const commit of commits) {
    if (commit.authorAccountId !== accountId) continue;
    // Merge commit là thao tác merge — đã có PR_MERGED đại diện.
    if (commit.parentCount > 1) continue;
    // Không lọc lại theo author date: khoảng đọc theo committer date (lúc
    // commit tới repository). Commit viết từ trước rồi mới amend/rebase/push
    // mang author date cũ hơn khoảng — vẫn là công sức thật, phải vào sổ
    // (02 §6.13). Chép chồng lên nhau không tạo trùng nhờ khóa.

    const dedupeKey = commitKey(commit);
    // Rebase/cherry-pick: SHA khác, cùng khóa — chỉ một sự kiện.
    if (events.has(dedupeKey)) continue;
    events.set(dedupeKey, {
      kind: 'COMMIT_AUTHORED',
      occurredAt: commit.authoredAt,
      quantity: 1,
      dedupeKey,
    });
  }

  return [...events.values()];
}

function pullRequestEvents(
  pullRequests: GitHubPullRequest[],
  accountId: string,
  within: (date: Date) => boolean,
): ActivityEventInput[] {
  const events: ActivityEventInput[] = [];

  for (const pullRequest of pullRequests) {
    // PR_MERGED cũng chỉ tính cho PR người dùng mở, bất kể ai bấm merge.
    if (pullRequest.authorAccountId !== accountId) continue;
    const dedupeKey = String(pullRequest.number);

    if (within(pullRequest.createdAt)) {
      events.push({
        kind: 'PR_OPENED',
        occurredAt: pullRequest.createdAt,
        quantity: 1,
        dedupeKey,
      });
    }
    if (pullRequest.mergedAt && within(pullRequest.mergedAt)) {
      events.push({
        kind: 'PR_MERGED',
        occurredAt: pullRequest.mergedAt,
        quantity: 1,
        dedupeKey,
      });
    }
  }

  return events;
}

/** Băm author date + message; chỉ lưu mã băm, không bao giờ lưu message. */
function commitKey(commit: GitHubCommit): string {
  return createHash('sha256')
    .update(`${commit.authoredAt.toISOString()}\n${commit.message}`)
    .digest('hex');
}
