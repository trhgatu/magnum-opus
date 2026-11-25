import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import {
  MemoryCreatedEvent,
  MemoryPermanentlyDeletedEvent,
  MemoryRedatedEvent,
  MemoryRestoredEvent,
  MemoryTrashedEvent,
} from '@reflection/memory/domain/events';
import {
  MemoryCreated,
  MemoryPermanentlyDeleted,
  MemoryRedated,
  MemoryTrashed,
  MemoryRestored,
} from '@reflection/memory/contracts';

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
      precision: event.precision,
    }),
  }),
  publish({
    event: MemoryRedatedEvent,
    as: MemoryRedated,
    aggregateId: (event) => event.memoryId,
    toPayload: (event) => ({
      memoryId: event.memoryId,
      ownerId: event.ownerId,
      memoryOccurredOn: event.memoryOccurredOn?.toISOString() ?? null,
      precision: event.precision,
    }),
  }),
  publish({
    event: MemoryTrashedEvent,
    as: MemoryTrashed,
    aggregateId: (event) => event.memoryId,
    toPayload: (event) => ({
      memoryId: event.memoryId,
      ownerId: event.ownerId,
    }),
  }),
  publish({
    event: MemoryRestoredEvent,
    as: MemoryRestored,
    aggregateId: (event) => event.memoryId,
    toPayload: (event) => ({
      memoryId: event.memoryId,
      ownerId: event.ownerId,
    }),
  }),
  publish({
    event: MemoryPermanentlyDeletedEvent,
    as: MemoryPermanentlyDeleted,
    aggregateId: (event) => event.memoryId,
    toPayload: (event) => ({
      memoryId: event.memoryId,
      ownerId: event.ownerId,
    }),
  }),
])
export class MemoryOutbox {}
