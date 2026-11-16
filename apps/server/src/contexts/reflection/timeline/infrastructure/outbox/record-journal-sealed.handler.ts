import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { JournalEntrySealed } from '@reflection/journal/contracts/journal-entry-sealed.contract';
import {
  TIMELINE_WRITER,
  type TimelineWriter,
} from '../../application/ports/timeline-writer.port';

type Payload = PayloadOf<typeof JournalEntrySealed>;

@Injectable()
@OutboxHandler(JournalEntrySealed)
export class RecordJournalSealedHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(TIMELINE_WRITER) private readonly timeline: TimelineWriter,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.timeline.recordJournalSealed(
      payload.ownerId,
      payload.journalEntryId,
      payload.sealedAt,
    );
  }
}
