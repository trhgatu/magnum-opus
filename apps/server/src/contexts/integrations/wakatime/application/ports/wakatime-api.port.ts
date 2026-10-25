import type { WakaTimeAccount } from '../../domain/wakatime-connection.entity';

export const WAKATIME_API = Symbol('WAKATIME_API');

export interface WakaTimeUser {
  account: WakaTimeAccount;
  /** Múi giờ IANA của tài khoản — WakaTime chia ngày theo múi giờ này. */
  timeZone: string;
}

export interface WakaTimeProject {
  id: string;
  name: string;
  lastHeartbeatAt: Date | null;
}

/** Một đoạn code: chỉ project, lúc bắt đầu và độ dài (BR-PAC-043). */
export interface WakaTimeSession {
  project: string;
  start: Date;
  seconds: number;
}

/** Một ngày WakaTime: khoảng [start, end) và các đoạn code trong ngày. */
export interface WakaTimeDay {
  start: Date;
  end: Date;
  sessions: WakaTimeSession[];
}

/**
 * Mọi method ném WakaTimeKeyInvalidException, WakaTimeRateLimitedException
 * hoặc WakaTimeUnavailableException.
 */
export interface WakaTimeApi {
  /** Tài khoản sở hữu API key. */
  verifyKey(apiKey: string): Promise<WakaTimeAccount>;

  /** Tài khoản và múi giờ của nó. */
  currentUser(apiKey: string): Promise<WakaTimeUser>;

  /** Mọi project của tài khoản. */
  listProjects(apiKey: string): Promise<WakaTimeProject[]>;

  /** Các đoạn code của mọi project trong một ngày (YYYY-MM-DD, múi giờ tài khoản). */
  durations(apiKey: string, date: string): Promise<WakaTimeDay>;
}
