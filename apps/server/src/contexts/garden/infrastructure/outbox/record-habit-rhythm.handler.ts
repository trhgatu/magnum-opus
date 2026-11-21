import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { HabitScheduleVersionStarted } from '@/contexts/forge/habit/contracts/habit-schedule-version-started.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';

type Payload = PayloadOf<typeof HabitScheduleVersionStarted>;

@Injectable()
@OutboxHandler(HabitScheduleVersionStarted)
export class RecordHabitRhythmHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
  ) {}

  handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    return this.ledger.record({
      subjectKind: 'HABIT',
      subjectId: payload.habitId,
      kind: 'RHYTHM_SET',
      detail: { type: payload.frequencyType, days: payload.frequencyDays },
      occurredOn: payload.effectiveFrom,
      sourceEventId: eventId,
    });
  }
}
