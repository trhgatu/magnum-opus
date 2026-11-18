import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { HabitCreated } from '@/contexts/forge/habit/contracts/habit-created.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitCreated>;

@Injectable()
@OutboxHandler(HabitCreated)
export class PlantCreatedHabitHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.plant({
      ownerId: payload.ownerId,
      subjectKind: 'HABIT',
      subjectId: payload.habitId,
      variant: payload.habitType,
      nameAtPlanting: payload.title,
      plantedOn: payload.startedOn,
    });
  }
}
