import { DomainEvent } from '@shared/domain/events/domain-event';

import { HabitCheckInDate } from '../value-objects';

export class HabitCheckInUndoneEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly date: HabitCheckInDate,
  ) {
    super();
  }
}
