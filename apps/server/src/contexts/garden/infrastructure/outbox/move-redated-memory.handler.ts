import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { MemoryRedated } from '@reflection/memory/contracts';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';
import { lanternPrecision } from '../../domain/garden-lantern';

type Payload = PayloadOf<typeof MemoryRedated>;

@Injectable()
@OutboxHandler(MemoryRedated)
export class MoveRedatedMemoryHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.moveLantern(
      payload.memoryId,
      payload.memoryOccurredOn,
      lanternPrecision(payload.precision, payload.memoryOccurredOn),
    );
  }
}
