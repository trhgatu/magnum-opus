import { DomainEvent } from '@shared/domain/events/domain-event';

export class JournalEntrySealedEvent extends DomainEvent {
  constructor(
    public readonly journalEntryId: string,
    public readonly ownerId: string,
    public readonly sealedAt: Date,
  ) {
    super();
  }
}
