import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitTrashed } from '@/contexts/forge/habit/contracts/habit-trashed.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitTrashed>;

@Injectable()
@OutboxHandler(HabitTrashed)
export class HideTrashedHabitHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ occurredAt, payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.hide('HABIT', payload.habitId, occurredAt);
  }
}
