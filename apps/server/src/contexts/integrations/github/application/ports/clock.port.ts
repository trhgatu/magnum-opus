export const CLOCK = Symbol('GITHUB_CLOCK');

export interface Clock {
  now(): Date;
}
