import type { OnThisDayItemOpenedEvent } from '../../domain/events/on-this-day-item-opened.event';

export const ON_THIS_DAY_OPENINGS = Symbol('ON_THIS_DAY_OPENINGS');

export interface OnThisDayOpenings {
  record(event: OnThisDayItemOpenedEvent): Promise<void>;
}
