import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitCheckedIn } from '@/contexts/forge/habit-check-in/contracts/habit-checked-in.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitCheckedIn>;

@Injectable()
@OutboxHandler(HabitCheckedIn)
export class RecordHabitCheckInHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.record({
      subjectKind: 'HABIT',
      subjectId: payload.habitId,
      kind: 'TENDED',
      occurredOn: payload.date,
      sourceEventId: eventId,
    });
  }
}
