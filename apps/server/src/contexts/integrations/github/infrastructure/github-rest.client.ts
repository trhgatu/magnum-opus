import type {
  GitHubApi,
  VerifiedGitHubToken,
} from '../application/ports/github-api.port';
import {
  GitHubRateLimitedException,
  GitHubTokenInsufficientScopeException,
  GitHubTokenInvalidException,
  GitHubUnavailableException,
} from '../domain/exceptions';

const API_VERSION = '2022-11-28';
const TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

interface GitHubUser {
  id: number;
  node_id: string;
  login: string;
}

export interface GitHubRestClientOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
  now?: () => Date;
}

export class GitHubRestClient implements GitHubApi {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly now: () => Date;

  constructor(options: GitHubRestClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.now = options.now ?? (() => new Date());
  }

  async verifyToken(token: string): Promise<VerifiedGitHubToken> {
    const userResponse = await this.request('/user', token);
    if (userResponse.status === 401) throw new GitHubTokenInvalidException();
    this.throwIfNotOk(userResponse);
    const user = (await userResponse.json()) as GitHubUser;

    // Token đọc được /user nhưng chưa chắc đọc được repository.
    const reposResponse = await this.request('/user/repos?per_page=1', token);
    if (reposResponse.status === 401) throw new GitHubTokenInvalidException();
    this.throwIfRateLimited(reposResponse);
    if (reposResponse.status === 403 || reposResponse.status === 404) {
      throw new GitHubTokenInsufficientScopeException();
    }
    this.throwIfNotOk(reposResponse);

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

  private async request(path: string, token: string): Promise<Response> {
    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': API_VERSION,
          'User-Agent': 'magnum-opus',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Lỗi mạng hoặc quá thời gian. Không giữ lỗi gốc: thông điệp của nó
      // có thể chứa URL hoặc header của request.
      throw new GitHubUnavailableException();
    }
  }

  private throwIfRateLimited(response: Response): void {
    if (response.status !== 403 && response.status !== 429) return;

    const isRateLimited =
      response.status === 429 ||
      response.headers.get('retry-after') !== null ||
      response.headers.get('x-ratelimit-remaining') === '0';

    if (isRateLimited) {
      throw new GitHubRateLimitedException(this.secondsUntilRetry(response));
    }
  }

  private throwIfNotOk(response: Response): void {
    this.throwIfRateLimited(response);
    if (!response.ok) throw new GitHubUnavailableException();
  }

  private secondsUntilRetry(response: Response): number {
    const retryAfter = Number(response.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter;

    const reset = Number(response.headers.get('x-ratelimit-reset'));
    if (Number.isFinite(reset) && reset > 0) {
      return Math.max(0, Math.ceil(reset - this.now().getTime() / 1000));
    }

    return DEFAULT_RETRY_AFTER_SECONDS;
  }
}
/** "2027-10-14 00:00:00 UTC" → Date. Định dạng lạ → null, không làm hỏng kết nối. */
function parseExpiration(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.replace(' UTC', 'Z').replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}
