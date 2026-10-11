import { DomainEvent } from '@shared/domain/events/domain-event';

import { RoutineLifecycleAction } from '../enums';
import { RoutineCalendarDate } from '../value-objects';

export class RoutineLifecycleTransitionedEvent extends DomainEvent {
  constructor(
    public readonly routineId: string,
    public readonly ownerId: string,
    public readonly action: RoutineLifecycleAction,
    public readonly effectiveOn: RoutineCalendarDate,
  ) {
    super();
  }
}
