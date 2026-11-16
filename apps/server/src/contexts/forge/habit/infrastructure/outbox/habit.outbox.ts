import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { HabitPermanentlyDeleted } from '../../contracts/habit-permanently-deleted.contract';
import { HabitPermanentlyDeletedEvent } from '../../domain/events';

@Injectable()
@OutboxPublisher([
  publish({
    event: HabitPermanentlyDeletedEvent,
    as: HabitPermanentlyDeleted,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({ habitId: event.habitId, ownerId: event.ownerId }),
  }),
])
export class HabitOutbox {}
