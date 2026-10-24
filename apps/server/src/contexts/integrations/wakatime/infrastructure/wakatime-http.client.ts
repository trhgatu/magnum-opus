import type { WakaTimeApi } from '../application/ports/wakatime-api.port';
import {
  WakaTimeKeyInvalidException,
  WakaTimeRateLimitedException,
  WakaTimeUnavailableException,
} from '../domain/exceptions';
import type { WakaTimeAccount } from '../domain/wakatime-connection.entity';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

interface WakaTimeUserPayload {
  data?: {
    id?: string;
    username?: string | null;
    display_name?: string | null;
  };
}

export interface WakaTimeHttpClientOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * WakaTime API v1, chỉ đọc. Xác thực bằng `Basic base64(apiKey)` (BA 08 §2).
 * Không bao giờ để API key lọt vào lỗi.
 */
export class WakaTimeHttpClient implements WakaTimeApi {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: WakaTimeHttpClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://wakatime.com/api/v1';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async verifyKey(apiKey: string): Promise<WakaTimeAccount> {
    const response = await this.request('/users/current', apiKey);
    if (response.status === 401 || response.status === 403) {
      throw new WakaTimeKeyInvalidException();
    }
    if (response.status === 429) throw rateLimited(response);
    if (!response.ok) throw new WakaTimeUnavailableException();

    const payload = (await response
      .json()
      .catch(() => null)) as WakaTimeUserPayload | null;
    const user = payload?.data;
    if (!user?.id) throw new WakaTimeUnavailableException();

    return {
      id: user.id,
      // Tài khoản chưa đặt username vẫn có tên hiển thị hoặc id.
      username: user.username || user.display_name || user.id,
    };
  }

  private async request(path: string, apiKey: string): Promise<Response> {
    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
          Accept: 'application/json',
          'User-Agent': 'magnum-opus',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      // Lỗi mạng hoặc quá thời gian. Không giữ lỗi gốc: thông điệp của nó
      // có thể chứa URL hoặc header của request.
      throw new WakaTimeUnavailableException();
    }
  }
}

function rateLimited(response: Response): WakaTimeRateLimitedException {
  const seconds = Number(response.headers.get('retry-after'));
  return new WakaTimeRateLimitedException(
    Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds)
      : DEFAULT_RETRY_AFTER_SECONDS,
  );
}
