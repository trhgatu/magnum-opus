import type { WakaTimeApi } from '../application/ports/wakatime-api.port';
import {
  WakaTimeKeyInvalidException,
  WakaTimeRateLimitedException,
  WakaTimeUnavailableException,
} from '../domain/exceptions';
import type { WakaTimeAccount } from '../domain/wakatime-connection.entity';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

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

    const payload: unknown = await response.json().catch(() => null);
    const user = isRecord(payload) ? payload.data : undefined;
    // JSON từ bên ngoài: chỉ tin trường là chuỗi không rỗng.
    const id = isRecord(user) ? text(user.id) : null;
    if (!isRecord(user) || !id) throw new WakaTimeUnavailableException();

    return {
      id,
      // Tài khoản chưa đặt username vẫn có tên hiển thị hoặc id.
      username: text(user.username) ?? text(user.display_name) ?? id,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

function rateLimited(response: Response): WakaTimeRateLimitedException {
  const seconds = Number(response.headers.get('retry-after'));
  return new WakaTimeRateLimitedException(
    Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds)
      : DEFAULT_RETRY_AFTER_SECONDS,
  );
}
