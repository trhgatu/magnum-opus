import { Logger } from '@nestjs/common';

import type {
  WakaTimeApi,
  WakaTimeDay,
  WakaTimeProject,
  WakaTimeSession,
  WakaTimeUser,
} from '../application/ports/wakatime-api.port';

import {
  WakaTimeKeyInvalidException,
  WakaTimeRateLimitedException,
  WakaTimeUnavailableException,
} from '../domain/exceptions';
import type { WakaTimeAccount } from '../domain/wakatime-connection.entity';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MAX_PROJECT_PAGES = 50;

export interface WakaTimeHttpClientOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

export class WakaTimeHttpClient implements WakaTimeApi {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger = new Logger(WakaTimeHttpClient.name);

  constructor(options: WakaTimeHttpClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://wakatime.com/api/v1';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async verifyKey(apiKey: string): Promise<WakaTimeAccount> {
    return (await this.currentUser(apiKey)).account;
  }

  async currentUser(apiKey: string): Promise<WakaTimeUser> {
    const payload = await this.getJson('/users/current', apiKey);
    const user = payload.data;
    const id = isRecord(user) ? text(user.id) : null;
    if (!isRecord(user) || !id)
      throw this.unavailable('/users/current', 'user without id');

    return {
      account: {
        id,
        username: text(user.username) ?? text(user.display_name) ?? id,
      },
      timeZone: validTimeZone(text(user.timezone)) ?? 'UTC',
    };
  }

  async listProjects(apiKey: string): Promise<WakaTimeProject[]> {
    const projects: WakaTimeProject[] = [];
    let page: number | null = 1;

    for (let read = 0; page !== null && read < MAX_PROJECT_PAGES; read += 1) {
      const payload = await this.getJson(
        `/users/current/projects?page=${page}`,
        apiKey,
      );
      for (const item of list(payload.data)) {
        const id = text(item.id);
        const name = text(item.name);
        if (id && name) {
          projects.push({
            id,
            name,
            lastHeartbeatAt: instant(item.last_heartbeat_at),
          });
        }
      }
      page = typeof payload.next_page === 'number' ? payload.next_page : null;
    }
    if (page !== null)
      throw this.unavailable(
        '/users/current/projects',
        `more than ${MAX_PROJECT_PAGES} pages`,
      );
    return projects;
  }

  async durations(apiKey: string, date: string): Promise<WakaTimeDay> {
    const payload = await this.getJson(
      `/users/current/durations?date=${encodeURIComponent(date)}`,
      apiKey,
    );
    const start = instant(payload.start);
    const lastSecond = instant(payload.end);
    if (!start || !lastSecond)
      throw this.unavailable(
        '/users/current/durations',
        'missing start or end',
      );
    if (!Array.isArray(payload.data))
      throw this.unavailable(
        '/users/current/durations',
        'data is not an array',
      );

    const sessions: WakaTimeSession[] = [];
    for (const item of list(payload.data)) {
      const project = text(item.project);
      const time = item.time;
      const seconds = item.duration;
      if (!project || !isPositive(time) || !isPositive(seconds)) continue;
      sessions.push({ project, start: new Date(time * 1000), seconds });
    }

    return {
      start,
      end: new Date(Math.floor(lastSecond.getTime() / 1000) * 1000 + 1000),
      sessions,
    };
  }

  private async getJson(
    path: string,
    apiKey: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.request(path, apiKey);
    if (response.status === 401 || response.status === 403) {
      throw new WakaTimeKeyInvalidException();
    }
    if (response.status === 429) throw rateLimited(response);
    if (!response.ok) throw this.unavailable(path, `HTTP ${response.status}`);

    const payload: unknown = await response.json().catch(() => null);
    if (!isRecord(payload))
      throw this.unavailable(path, 'body is not a JSON object');
    return payload;
  }

  private async request(path: string, apiKey: string): Promise<Response> {
    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'User-Agent': 'magnum-opus',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw this.unavailable(
        path,
        error instanceof Error ? error.name : 'unknown error',
      );
    }
  }

  private unavailable(
    path: string,
    reason: string,
  ): WakaTimeUnavailableException {
    const endpoint = path.split('?')[0];
    this.logger.warn(`WakaTime ${endpoint} unavailable: ${reason}`);
    return new WakaTimeUnavailableException();
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

function instant(value: unknown): Date | null {
  const date = typeof value === 'string' ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function validTimeZone(timeZone: string | null): string | null {
  if (!timeZone) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return null;
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
