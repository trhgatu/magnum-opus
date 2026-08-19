import { DomainEvent } from '@shared/domain/events/domain-event';

export class MemoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly memoryId: string,
    public readonly ownerId: string,
    public readonly memoryOccurredOn: Date | null,
  ) {
    super();
  }
}
