import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { MemoryCreatedEvent } from '@reflection/memory/domain/events/memory-created.event';
import { MemoryCreated } from '@reflection/memory/contracts/memory-created.contract';

@Injectable()
@OutboxPublisher([
  publish({
    event: MemoryCreatedEvent,
    as: MemoryCreated,
    aggregateId: (event) => event.memoryId,
    toPayload: (event) => ({
      memoryId: event.memoryId,
      ownerId: event.ownerId,
      memoryOccurredOn: event.memoryOccurredOn?.toISOString() ?? null,
    }),
  }),
])
export class MemoryOutbox {}
