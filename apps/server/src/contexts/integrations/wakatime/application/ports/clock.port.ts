export const CLOCK = Symbol('WAKATIME_CLOCK');

export interface Clock {
  now(): Date;
}
