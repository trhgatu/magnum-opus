export const TODAY_CLOCK = Symbol('TODAY_CLOCK');

export interface TodayClock {
  now(): Date;
}
