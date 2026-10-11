import { DomainEvent } from '@shared/domain/events/domain-event';

import { RoutineCalendarDate } from '../value-objects';

export class RoutineHabitRemovedEvent extends DomainEvent {
  constructor(
    public readonly routineId: string,
    public readonly ownerId: string,
    public readonly habitId: string,
    public readonly removedOn: RoutineCalendarDate,
  ) {
    super();
  }
}
