import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { MemoryCreated } from '@reflection/memory/contracts';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';
import { lanternPrecision } from '../../domain/garden-lantern';

type Payload = PayloadOf<typeof MemoryCreated>;

@Injectable()
@OutboxHandler(MemoryCreated)
export class HangCreatedMemoryHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.hangLantern({
      ownerId: payload.ownerId,
      memoryId: payload.memoryId,
      occurredOn: payload.memoryOccurredOn,
      precision: lanternPrecision(payload.precision, payload.memoryOccurredOn),
    });
  }
}
