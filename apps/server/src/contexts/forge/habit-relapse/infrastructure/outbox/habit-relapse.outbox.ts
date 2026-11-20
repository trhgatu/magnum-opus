import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { HabitRelapsed } from '../../contracts/habit-relapsed.contract';
import { HabitRelapsedEvent } from '../../domain/events';

@Injectable()
@OutboxPublisher([
  publish({
    event: HabitRelapsedEvent,
    as: HabitRelapsed,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      occurredOn: event.relapsedOn,
    }),
  }),
])
export class HabitRelapseOutbox {}
