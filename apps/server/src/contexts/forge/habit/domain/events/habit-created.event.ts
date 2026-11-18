import { DomainEvent } from '@shared/domain/events/domain-event';

import { HabitType } from '../enums';
import { HabitCalendarDate } from '../value-objects';

export class HabitCreatedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly type: HabitType,
    public readonly title: string,
    public readonly startedOn: HabitCalendarDate,
  ) {
    super();
  }
}
