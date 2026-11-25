import { DomainEvent } from '@shared/domain/events/domain-event';

export class MemoryPermanentlyDeletedEvent extends DomainEvent {
  constructor(
    public readonly memoryId: string,
    public readonly ownerId: string,
  ) {
    super();
  }
}
