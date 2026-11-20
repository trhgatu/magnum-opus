import { DomainEvent } from '@shared/domain/events/domain-event';

import { HabitCalendarDate } from '../value-objects';

export class HabitQuitStartChangedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly startedOn: HabitCalendarDate,
  ) {
    super();
  }
}
