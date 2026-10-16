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
const DEFAULT_TIMEOUT_MS = 10_000;
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
  timeoutMs?: number;
}

export class GitHubRestClient implements GitHubApi {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly now: () => Date;
  private readonly timeoutMs: number;

  constructor(options: GitHubRestClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async verifyToken(token: string): Promise<VerifiedGitHubToken> {
    const userResponse = await this.request('/user', token);
    if (userResponse.status === 401) throw new GitHubTokenInvalidException();
    await this.throwIfNotOk(userResponse);
    const user = (await userResponse.json()) as GitHubUser;

    // Token đọc được /user nhưng chưa chắc đọc được repository.
    const reposResponse = await this.request('/user/repos?per_page=1', token);
    if (reposResponse.status === 401) throw new GitHubTokenInvalidException();
    await this.throwIfRateLimited(reposResponse);
    if (reposResponse.status === 403 || reposResponse.status === 404) {
      throw new GitHubTokenInsufficientScopeException();
    }
    await this.throwIfNotOk(reposResponse);

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
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      // Lỗi mạng hoặc quá thời gian. Không giữ lỗi gốc: thông điệp của nó
      // có thể chứa URL hoặc header của request.
      throw new GitHubUnavailableException();
    }
  }

  /**
   * Giới hạn chính: 429, hoặc 403 kèm `x-ratelimit-remaining: 0` / `retry-after`.
   * Giới hạn phụ (secondary rate limit) có thể là 403 không kèm header nào —
   * chỉ nhận ra được qua nội dung "rate limit" trong thông báo lỗi.
   */
  private async throwIfRateLimited(response: Response): Promise<void> {
    if (response.status !== 403 && response.status !== 429) return;

    const isRateLimited =
      response.status === 429 ||
      response.headers.get('retry-after') !== null ||
      response.headers.get('x-ratelimit-remaining') === '0' ||
      (await mentionsRateLimit(response));

    if (isRateLimited) {
      throw new GitHubRateLimitedException(this.secondsUntilRetry(response));
    }
  }

  private async throwIfNotOk(response: Response): Promise<void> {
    await this.throwIfRateLimited(response);
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

/** Đọc thông báo lỗi trên một bản sao, để body gốc vẫn còn nguyên. */
async function mentionsRateLimit(response: Response): Promise<boolean> {
  try {
    const body = (await response.clone().json()) as { message?: unknown };
    return typeof body.message === 'string' && /rate limit/i.test(body.message);
  } catch {
    return false;
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
