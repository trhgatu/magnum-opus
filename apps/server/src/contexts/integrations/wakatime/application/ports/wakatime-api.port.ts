import type { WakaTimeAccount } from '../../domain/wakatime-connection.entity';

export const WAKATIME_API = Symbol('WAKATIME_API');

export interface WakaTimeApi {
  /**
   * Tài khoản sở hữu API key. Ném WakaTimeKeyInvalidException,
   * WakaTimeRateLimitedException hoặc WakaTimeUnavailableException.
   */
  verifyKey(apiKey: string): Promise<WakaTimeAccount>;
}
