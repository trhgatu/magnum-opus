import type {
  GitHubActivityApi,
  GitHubCommit,
  GitHubPullRequest,
} from '../application/ports/github-activity-api.port';
import {
  GitHubRepositoryNotAccessibleException,
  GitHubTokenInvalidException,
  GitHubUnavailableException,
} from '../domain/exceptions';
import { GitHubHttp, type GitHubHttpOptions } from './github-http';

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface Connection<T> {
  pageInfo: PageInfo;
  nodes: T[];
}

interface CommitPayload {
  oid: string;
  authoredDate: string;
  message: string;
  parents: { totalCount: number };
  author: { user: { databaseId: number } | null } | null;
}

interface PullRequestPayload {
  number: number;
  createdAt: string;
  mergedAt: string | null;
  updatedAt: string;
  author: { databaseId?: number } | null;
}

interface RepositoryPayload {
  refs?: Connection<{
    name: string;
    target: { history?: Connection<unknown> } | null;
  }>;
  ref?: { target: { history?: Connection<unknown> } | null } | null;
  pullRequests?: Connection<unknown>;
}

/** Trần số request cho một lần đọc — chặn vòng lặp vô tận nếu GitHub trả sai. */
const MAX_REQUESTS = 100;

const COMMIT_FIELDS = `
  pageInfo { hasNextPage endCursor }
  nodes {
    oid
    authoredDate
    message
    parents { totalCount }
    author { user { databaseId } }
  }
`;

/** Mọi nhánh, mỗi nhánh kèm trang lịch sử đầu tiên — 1 điểm rate limit. */
const BRANCHES_QUERY = `
  query Branches($repositoryId: ID!, $authorId: ID!, $since: GitTimestamp!, $until: GitTimestamp!, $refCursor: String) {
    node(id: $repositoryId) {
      ... on Repository {
        refs(refPrefix: "refs/heads/", first: 100, after: $refCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name
            target {
              ... on Commit {
                history(first: 100, since: $since, until: $until, author: { id: $authorId }) {
                  ${COMMIT_FIELDS}
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** Các trang lịch sử tiếp theo của một nhánh. */
const HISTORY_QUERY = `
  query History($repositoryId: ID!, $qualifiedName: String!, $authorId: ID!, $since: GitTimestamp!, $until: GitTimestamp!, $historyCursor: String) {
    node(id: $repositoryId) {
      ... on Repository {
        ref(qualifiedName: $qualifiedName) {
          target {
            ... on Commit {
              history(first: 100, after: $historyCursor, since: $since, until: $until, author: { id: $authorId }) {
                ${COMMIT_FIELDS}
              }
            }
          }
        }
      }
    }
  }
`;

/** Luôn truyền states tường minh, không dựa vào mặc định của GitHub. */
const PULL_REQUESTS_QUERY = `
  query PullRequests($repositoryId: ID!, $cursor: String) {
    node(id: $repositoryId) {
      ... on Repository {
        pullRequests(first: 100, after: $cursor, states: [OPEN, CLOSED, MERGED], orderBy: { field: UPDATED_AT, direction: DESC }) {
          pageInfo { hasNextPage endCursor }
          nodes {
            number
            createdAt
            mergedAt
            updatedAt
            author { ... on User { databaseId } }
          }
        }
      }
    }
  }
`;

export class GitHubGraphqlClient implements GitHubActivityApi {
  private readonly http: GitHubHttp;

  constructor(options: GitHubHttpOptions = {}) {
    this.http = new GitHubHttp(options);
  }

  async listCommits(
    token: string,
    input: {
      repositoryNodeId: string;
      authorNodeId: string;
      since: Date;
      until: Date;
    },
  ): Promise<GitHubCommit[]> {
    const budget = new RequestBudget();
    const commits = new Map<string, GitHubCommit>();
    const add = (history: Connection<unknown> | undefined) => {
      for (const node of history?.nodes ?? []) {
        const commit = toCommit(node);
        // Nhiều nhánh chung lịch sử: mỗi commit chỉ giữ một lần.
        if (!commits.has(commit.oid)) commits.set(commit.oid, commit);
      }
    };
    const window = {
      repositoryId: input.repositoryNodeId,
      authorId: input.authorNodeId,
      since: input.since.toISOString(),
      until: input.until.toISOString(),
    };

    let refCursor: string | null = null;
    do {
      budget.spend();
      const repository = await this.query(token, BRANCHES_QUERY, {
        ...window,
        refCursor,
      });
      const refs = repository.refs;
      if (!refs) throw new GitHubUnavailableException();

      for (const branch of refs.nodes) {
        let history = branch.target?.history;
        add(history);

        while (history?.pageInfo.hasNextPage) {
          budget.spend();
          const next = await this.query(token, HISTORY_QUERY, {
            ...window,
            qualifiedName: `refs/heads/${branch.name}`,
            historyCursor: history.pageInfo.endCursor,
          });
          history = next.ref?.target?.history;
          add(history);
        }
      }

      refCursor = refs.pageInfo.hasNextPage ? refs.pageInfo.endCursor : null;
    } while (refCursor);

    return [...commits.values()];
  }

  async listPullRequests(
    token: string,
    input: { repositoryNodeId: string; updatedSince: Date },
  ): Promise<GitHubPullRequest[]> {
    const budget = new RequestBudget();
    const pullRequests: GitHubPullRequest[] = [];

    let cursor: string | null = null;
    do {
      budget.spend();
      const repository = await this.query(token, PULL_REQUESTS_QUERY, {
        repositoryId: input.repositoryNodeId,
        cursor,
      });
      const page = repository.pullRequests;
      if (!page) throw new GitHubUnavailableException();

      for (const node of page.nodes) {
        const pullRequest = toPullRequest(node);
        // Sắp theo updatedAt giảm dần: gặp PR cũ hơn mốc thì phần còn lại
        // cũng cũ hơn — dừng.
        if (pullRequest.updatedAt < input.updatedSince) return pullRequests;
        pullRequests.push(pullRequest);
      }

      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);

    return pullRequests;
  }

  /** Gửi một truy vấn, trả `data.node` đã kiểm tra lỗi. */
  private async query(
    token: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<RepositoryPayload> {
    const response = await this.http.request(
      `${this.http.baseUrl}/graphql`,
      token,
      { method: 'POST', body: { query, variables } },
    );
    if (response.status === 401) throw new GitHubTokenInvalidException();
    await this.http.throwIfNotOk(response);

    let body: {
      data?: { node?: RepositoryPayload | null };
      errors?: { type?: string }[];
    };
    try {
      body = (await response.json()) as typeof body;
    } catch {
      throw new GitHubUnavailableException();
    }

    // GraphQL báo lỗi bằng HTTP 200 kèm mảng errors.
    const errorType = body.errors?.[0]?.type;
    if (errorType === 'RATE_LIMITED') throw this.http.rateLimited(response);
    if (errorType === 'NOT_FOUND') {
      throw new GitHubRepositoryNotAccessibleException();
    }
    if (body.errors?.length) throw new GitHubUnavailableException();

    // node null: repository đã xóa hoặc token không còn thấy nó.
    const repository = body.data?.node;
    if (!repository) throw new GitHubRepositoryNotAccessibleException();
    return repository;
  }
}

class RequestBudget {
  private spent = 0;

  spend(): void {
    this.spent += 1;
    if (this.spent > MAX_REQUESTS) throw new GitHubUnavailableException();
  }
}

function toCommit(value: unknown): GitHubCommit {
  if (!isCommitPayload(value)) throw new GitHubUnavailableException();
  const databaseId = value.author?.user?.databaseId;
  return {
    oid: value.oid,
    authoredAt: new Date(value.authoredDate),
    message: value.message,
    parentCount: value.parents.totalCount,
    authorAccountId: databaseId === undefined ? null : String(databaseId),
  };
}

function toPullRequest(value: unknown): GitHubPullRequest {
  if (!isPullRequestPayload(value)) throw new GitHubUnavailableException();
  const databaseId = value.author?.databaseId;
  return {
    number: value.number,
    createdAt: new Date(value.createdAt),
    mergedAt: value.mergedAt ? new Date(value.mergedAt) : null,
    updatedAt: new Date(value.updatedAt),
    authorAccountId: databaseId === undefined ? null : String(databaseId),
  };
}

function isCommitPayload(value: unknown): value is CommitPayload {
  if (typeof value !== 'object' || value === null) return false;
  const commit = value as Record<string, unknown>;
  const parents = commit.parents as Record<string, unknown> | undefined;
  return (
    typeof commit.oid === 'string' &&
    isValidDate(commit.authoredDate) &&
    typeof commit.message === 'string' &&
    typeof parents?.totalCount === 'number'
  );
}

function isPullRequestPayload(value: unknown): value is PullRequestPayload {
  if (typeof value !== 'object' || value === null) return false;
  const pr = value as Record<string, unknown>;
  return (
    typeof pr.number === 'number' &&
    isValidDate(pr.createdAt) &&
    (pr.mergedAt === null || isValidDate(pr.mergedAt)) &&
    isValidDate(pr.updatedAt)
  );
}

const isValidDate = (value: unknown): boolean =>
  typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
