import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitRelapsed } from '@/contexts/forge/habit-relapse/contracts/habit-relapsed.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitRelapsed>;

@Injectable()
@OutboxHandler(HabitRelapsed)
export class RecordHabitRelapseHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.record({
      subjectKind: 'HABIT',
      subjectId: payload.habitId,
      kind: 'MARKED',
      mark: 'SCAR',
      occurredOn: payload.occurredOn,
      sourceEventId: eventId,
    });
  }
}
