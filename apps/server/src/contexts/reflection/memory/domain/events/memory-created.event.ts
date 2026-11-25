import { DomainEvent } from '@shared/domain/events/domain-event';

import { MemoryDatePrecision } from '../enums';
export class MemoryCreatedEvent extends DomainEvent {
  constructor(
    public readonly memoryId: string,
    public readonly ownerId: string,
    public readonly memoryOccurredOn: Date | null,
    public readonly precision: MemoryDatePrecision,
  ) {
    super();
  }
}
