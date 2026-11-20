import type { CalendarDay } from '@shared/domain/calendar-day';
import { DomainEvent } from '@shared/domain/events/domain-event';

export class HabitRelapsedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly relapsedOn: CalendarDay,
  ) {
    super();
  }
}
