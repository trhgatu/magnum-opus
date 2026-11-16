import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { JournalEntrySealedEvent } from '@reflection/journal/domain/events/journal-entry-sealed.event';
import { JournalEntrySealed } from '@reflection/journal/contracts/journal-entry-sealed.contract';

@Injectable()
@OutboxPublisher([
  publish({
    event: JournalEntrySealedEvent,
    as: JournalEntrySealed,
    aggregateId: (event) => event.journalEntryId,
    toPayload: (event) => ({
      journalEntryId: event.journalEntryId,
      ownerId: event.ownerId,
      sealedAt: event.sealedAt.toISOString(),
    }),
  }),
])
export class JournalOutbox {}
