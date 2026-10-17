import type {
  GitHubApi,
  VerifiedGitHubToken,
  GitHubRepositoryList,
  GitHubRepository,
  GitHubRepositoryRef,
} from '../application/ports/github-api.port';
import {
  GitHubTokenInsufficientScopeException,
  GitHubTokenInvalidException,
  GitHubUnavailableException,
  GitHubRepositoryNotAccessibleException,
} from '../domain/exceptions';
import { GitHubHttp, type GitHubHttpOptions } from './github-http';

const MAX_REPOSITORY_PAGES = 10;

interface GitHubRepoPayload {
  id: number;
  full_name: string;
  private: boolean;
  pushed_at: string | null;
}

interface GitHubUser {
  id: number;
  node_id: string;
  login: string;
}

export type GitHubRestClientOptions = GitHubHttpOptions;

export class GitHubRestClient implements GitHubApi {
  private readonly http: GitHubHttp;

  constructor(options: GitHubRestClientOptions = {}) {
    this.http = new GitHubHttp(options);
  }

  private get baseUrl(): string {
    return this.http.baseUrl;
  }

  async verifyToken(token: string): Promise<VerifiedGitHubToken> {
    const userResponse = await this.http.request(`${this.baseUrl}/user`, token);
    if (userResponse.status === 401) throw new GitHubTokenInvalidException();
    await this.http.throwIfNotOk(userResponse);
    const user = (await userResponse.json()) as GitHubUser;

    // Token đọc được /user nhưng chưa chắc đọc được repository.
    const reposResponse = await this.http.request(
      `${this.baseUrl}/user/repos?per_page=1`,
      token,
    );

    if (reposResponse.status === 401) throw new GitHubTokenInvalidException();
    await this.http.throwIfRateLimited(reposResponse);
    if (reposResponse.status === 403 || reposResponse.status === 404) {
      throw new GitHubTokenInsufficientScopeException();
    }
    await this.http.throwIfNotOk(reposResponse);

    return {
      account: {
        id: String(user.id),
        nodeId: user.node_id,
        login: user.login,
      },
      expiresAt: parseExpiration(
        userResponse.headers.get('github-authentication-token-expiration'),
      ),
    };
  }

  async listRepositories(token: string): Promise<GitHubRepositoryList> {
    const repositories: GitHubRepository[] = [];
    let url: string | null =
      `${this.baseUrl}/user/repos?per_page=100&sort=pushed`;

    for (let page = 0; page < MAX_REPOSITORY_PAGES && url; page++) {
      const response = await this.http.request(url, token);
      if (response.status === 401) throw new GitHubTokenInvalidException();
      await this.http.throwIfNotOk(response);

      repositories.push(...(await readRepositories(response)));
      url = this.nextPageUrl(response);
    }

    return { repositories, complete: url === null };
  }

  async findRepository(
    token: string,
    repositoryId: string,
  ): Promise<GitHubRepositoryRef> {
    // Id đi thẳng vào URL: chỉ nhận chữ số, để không chèn được đường dẫn khác.
    if (!/^\d+$/.test(repositoryId)) {
      throw new GitHubRepositoryNotAccessibleException();
    }

    const response = await this.http.request(
      `${this.baseUrl}/repositories/${repositoryId}`,
      token,
    );
    if (response.status === 401) throw new GitHubTokenInvalidException();
    // Trước khi xét 403: 403 có thể là rate limit, không phải mất quyền.
    await this.http.throwIfRateLimited(response);
    if (response.status === 403 || response.status === 404) {
      throw new GitHubRepositoryNotAccessibleException();
    }
    await this.http.throwIfNotOk(response);

    const payload = await readJson(response);
    if (!isRepositoryRefPayload(payload)) {
      throw new GitHubUnavailableException();
    }

    return { nodeId: payload.node_id, fullName: payload.full_name };
  }

  /** Link rel="next", chỉ khi cùng origin với baseUrl — không gửi token đi nơi khác. */
  private nextPageUrl(response: Response): string | null {
    const match = /<([^>]+)>;\s*rel="next"/.exec(
      response.headers.get('link') ?? '',
    );
    if (!match) return null;
    if (new URL(match[1]).origin !== new URL(this.baseUrl).origin) {
      throw new GitHubUnavailableException();
    }
    return match[1];
  }
}

/**
 * GitHub gửi "2027-10-14 00:00:00 UTC" hoặc "2027-10-14 00:00:00 +0700".
 * Định dạng lạ → null: không làm hỏng việc kết nối.
 */
function parseExpiration(value: string | null): Date | null {
  if (!value) return null;

  const match =
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (UTC|[+-]\d{4})$/.exec(
      value.trim(),
    );
  if (!match) return null;

  const [, day, time, zone] = match;
  const offset = zone === 'UTC' ? 'Z' : `${zone.slice(0, 3)}:${zone.slice(3)}`;
  const date = new Date(`${day}T${time}${offset}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** JSON hỏng hoặc sai hình dạng là lỗi phía GitHub, không phải lỗi của mình. */
async function readRepositories(
  response: Response,
): Promise<GitHubRepository[]> {
  const payload = await readJson(response);
  if (!Array.isArray(payload) || !payload.every(isRepoPayload)) {
    throw new GitHubUnavailableException();
  }
  return payload.map(toRepository);
}

function isRepositoryRefPayload(
  value: unknown,
): value is { node_id: string; full_name: string } {
  if (typeof value !== 'object' || value === null) return false;
  const repo = value as Record<string, unknown>;
  return typeof repo.node_id === 'string' && typeof repo.full_name === 'string';
}

function isRepoPayload(value: unknown): value is GitHubRepoPayload {
  if (typeof value !== 'object' || value === null) return false;
  const repo = value as Record<string, unknown>;
  return (
    typeof repo.id === 'number' &&
    typeof repo.full_name === 'string' &&
    typeof repo.private === 'boolean' &&
    (repo.pushed_at === null || isValidDate(repo.pushed_at))
  );
}

const isValidDate = (value: unknown): boolean =>
  typeof value === 'string' && !Number.isNaN(new Date(value).getTime());

const toRepository = (repo: GitHubRepoPayload): GitHubRepository => ({
  id: String(repo.id),
  fullName: repo.full_name,
  isPrivate: repo.private,
  pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
});

/** JSON hỏng là lỗi phía GitHub, không phải lỗi của mình. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new GitHubUnavailableException();
  }
}
