import { DomainEvent } from '@shared/domain/events/domain-event';

export class HabitTrashedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {
    super();
  }
}
