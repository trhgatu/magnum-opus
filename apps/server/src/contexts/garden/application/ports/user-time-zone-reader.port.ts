export const USER_TIME_ZONE_READER = Symbol('USER_TIME_ZONE_READER');

export interface UserTimeZoneReader {
  getForUser(userId: string): Promise<string>;
}
