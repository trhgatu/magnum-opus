import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { OnThisDayItemOpened } from '../../contracts/on-this-day-item-opened.contract';
import { OnThisDayItemOpenedEvent } from '../../domain/events/on-this-day-item-opened.event';

@Injectable()
@OutboxPublisher([
  publish({
    event: OnThisDayItemOpenedEvent,
    as: OnThisDayItemOpened,
    aggregateId: (event) => event.itemId,
    toPayload: (event) => ({
      ownerId: event.ownerId,
      kind: event.kind,
      itemId: event.itemId,
      openedAt: event.openedAt.toISOString(),
    }),
  }),
])
export class OnThisDayOutbox {}
