import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitRestoredFromTrash } from '@/contexts/forge/habit/contracts/habit-restored-from-trash.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitRestoredFromTrash>;

@Injectable()
@OutboxHandler(HabitRestoredFromTrash)
export class ShowRestoredHabitHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.show('HABIT', payload.habitId);
  }
}
