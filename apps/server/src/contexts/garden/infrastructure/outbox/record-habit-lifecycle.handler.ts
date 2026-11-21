import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitLifecycleTransitioned } from '@/contexts/forge/habit/contracts/habit-lifecycle-transitioned.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitLifecycleTransitioned>;

@Injectable()
@OutboxHandler(HabitLifecycleTransitioned)
export class RecordHabitLifecycleHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.record({
      subjectKind: 'HABIT',
      subjectId: payload.habitId,
      kind: payload.action === 'ARCHIVED' ? 'RESTED' : 'RESUMED',
      occurredOn: payload.effectiveOn,
      sourceEventId: eventId,
    });
  }
}
