export const CLOCK = Symbol('ACTIVITY_CLOCK');

export interface Clock {
  now(): Date;
}
