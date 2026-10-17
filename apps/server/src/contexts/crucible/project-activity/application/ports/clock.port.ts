export const CLOCK = Symbol('PROJECT_ACTIVITY_CLOCK');

export interface Clock {
  now(): Date;
}
