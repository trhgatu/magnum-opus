import { DomainEvent } from '@shared/domain/events/domain-event';

export class HabitRenamedEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly title: string,
  ) {
    super();
  }
}
