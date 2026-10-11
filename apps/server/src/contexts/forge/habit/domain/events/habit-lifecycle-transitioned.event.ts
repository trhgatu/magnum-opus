import { DomainEvent } from '@shared/domain/events/domain-event';

import { HabitLifecycleAction } from '../enums';
import { HabitCalendarDate } from '../value-objects';

export class HabitLifecycleTransitionedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly action: HabitLifecycleAction,
    public readonly effectiveOn: HabitCalendarDate,
  ) {
    super();
  }
}
