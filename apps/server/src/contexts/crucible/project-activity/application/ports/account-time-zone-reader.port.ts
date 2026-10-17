export const ACCOUNT_TIME_ZONE_READER = Symbol('ACCOUNT_TIME_ZONE_READER');

export interface AccountTimeZoneReader {
  /** Múi giờ hiện tại của tài khoản — dùng để chia ngày. */
  getForUser(userId: string): Promise<string>;
}
