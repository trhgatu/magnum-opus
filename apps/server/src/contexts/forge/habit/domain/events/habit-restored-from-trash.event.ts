import { DomainEvent } from '@shared/domain/events/domain-event';

export class HabitRestoredFromTrashEvent extends DomainEvent {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {
    super();
  }
}
