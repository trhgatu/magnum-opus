import { DomainEvent } from '@shared/domain/events/domain-event';

import { RoutineCalendarDate } from '../value-objects';

export class RoutineHabitAddedEvent extends DomainEvent {
  constructor(
    public readonly routineId: string,
    public readonly ownerId: string,
    public readonly habitId: string,
    public readonly addedOn: RoutineCalendarDate,
  ) {
    super();
  }
}
