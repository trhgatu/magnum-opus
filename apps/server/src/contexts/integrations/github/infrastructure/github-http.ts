import {
  GitHubRateLimitedException,
  GitHubUnavailableException,
} from '../domain/exceptions';

const API_VERSION = '2022-11-28';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

export interface GitHubHttpOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
  now?: () => Date;
  timeoutMs?: number;
}

/**
 * Phần HTTP chung của REST và GraphQL client: header, timeout, nhận diện
 * giới hạn request. Không bao giờ để token lọt vào lỗi.
 */
export class GitHubHttp {
  readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => Date;
  private readonly timeoutMs: number;

  constructor(options: GitHubHttpOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.now = options.now ?? (() => new Date());
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async request(
    url: string,
    token: string,
    init: { method?: 'GET' | 'POST'; body?: unknown } = {},
  ): Promise<Response> {
    try {
      return await this.fetchFn(url, {
        method: init.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': API_VERSION,
          'User-Agent': 'magnum-opus',
          ...(init.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
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
  async throwIfRateLimited(response: Response): Promise<void> {
    if (response.status !== 403 && response.status !== 429) return;

    const isRateLimited =
      response.status === 429 ||
      response.headers.get('retry-after') !== null ||
      response.headers.get('x-ratelimit-remaining') === '0' ||
      (await mentionsRateLimit(response));

    if (isRateLimited) throw this.rateLimited(response);
  }

  async throwIfNotOk(response: Response): Promise<void> {
    await this.throwIfRateLimited(response);
    if (!response.ok) throw new GitHubUnavailableException();
  }

  /** Lỗi giới hạn request, kèm số giây cần đợi đọc từ header. */
  rateLimited(response: Response): GitHubRateLimitedException {
    return new GitHubRateLimitedException(this.secondsUntilRetry(response));
  }

  private secondsUntilRetry(response: Response): number {
    const retryAfter = Number(response.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter;

    const reset = Number(response.headers.get('x-ratelimit-reset'));
    const untilReset = Math.ceil(reset - this.now().getTime() / 1000);
    // Mốc đã qua (đồng hồ lệch): đợi mặc định, không mời thử lại ngay.
    if (Number.isFinite(untilReset) && untilReset > 0) return untilReset;

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
