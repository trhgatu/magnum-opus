import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { MemoryCreated } from '@reflection/memory/contracts/memory-created.contract';
import {
  TIMELINE_WRITER,
  type TimelineWriter,
} from '../../application/ports/timeline-writer.port';

type Payload = PayloadOf<typeof MemoryCreated>;

@Injectable()
@OutboxHandler(MemoryCreated)
export class RecordMemoryCreatedHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(TIMELINE_WRITER) private readonly timeline: TimelineWriter,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.timeline.recordMemoryCreated(
      payload.ownerId,
      payload.memoryId,
      payload.memoryOccurredOn,
    );
  }
}
