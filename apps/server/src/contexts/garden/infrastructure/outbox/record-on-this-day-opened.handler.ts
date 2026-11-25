import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import { calendarDayAt, calendarDayToDate } from '@shared/domain/calendar-day';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { OnThisDayItemOpened } from '@reflection/on-this-day/contracts/on-this-day-item-opened.contract';
import {
  GARDEN_LEDGER_WRITER,
  type GardenLedgerWriter,
} from '../../application/ports/garden-ledger-writer.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../../application/ports/user-time-zone-reader.port';

type Payload = PayloadOf<typeof OnThisDayItemOpened>;

@Injectable()
@OutboxHandler(OnThisDayItemOpened)
export class RecordOnThisDayOpenedHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(GARDEN_LEDGER_WRITER) private readonly ledger: GardenLedgerWriter,
    @Inject(USER_TIME_ZONE_READER)
    private readonly timeZoneReader: UserTimeZoneReader,
  ) {}

  async handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    const timeZone = await this.timeZoneReader.getForUser(payload.ownerId);
    await this.ledger.recordReflection({
      ownerId: payload.ownerId,
      sourceRef: payload.itemId,
      occurredOn: calendarDayToDate(calendarDayAt(payload.openedAt, timeZone)),
      sourceEventId: eventId,
    });
  }
}
