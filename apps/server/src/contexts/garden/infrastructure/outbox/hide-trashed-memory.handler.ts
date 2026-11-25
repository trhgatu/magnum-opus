import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { MemoryTrashed } from '@reflection/memory/contracts';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof MemoryTrashed>;

@Injectable()
@OutboxHandler(MemoryTrashed)
export class HideTrashedMemoryHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ occurredAt, payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.hideLantern(payload.memoryId, occurredAt);
  }
}
