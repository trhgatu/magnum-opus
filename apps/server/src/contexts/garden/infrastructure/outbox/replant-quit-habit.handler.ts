import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { HabitQuitStartChanged } from '@/contexts/forge/habit/contracts/habit-quit-start-changed.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitQuitStartChanged>;

@Injectable()
@OutboxHandler(HabitQuitStartChanged)
export class ReplantQuitHabitHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.replant('HABIT', payload.habitId, payload.startedOn);
  }
}
