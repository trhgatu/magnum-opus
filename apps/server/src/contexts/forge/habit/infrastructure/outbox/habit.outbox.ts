import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { HabitPermanentlyDeleted } from '../../contracts/habit-permanently-deleted.contract';
import { HabitPermanentlyDeletedEvent } from '../../domain/events';

import { HabitCreated } from '../../contracts/habit-created.contract';
import { HabitQuitStartChanged } from '../../contracts/habit-quit-start-changed.contract';

import { HabitCreatedEvent } from '../../domain/events';
import { HabitQuitStartChangedEvent } from '../../domain/events';

@Injectable()
@OutboxPublisher([
  publish({
    event: HabitPermanentlyDeletedEvent,
    as: HabitPermanentlyDeleted,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({ habitId: event.habitId, ownerId: event.ownerId }),
  }),

  publish({
    event: HabitCreatedEvent,
    as: HabitCreated,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      habitType: event.type,
      title: event.title,
      startedOn: event.startedOn.value,
    }),
  }),

  publish({
    event: HabitQuitStartChangedEvent,
    as: HabitQuitStartChanged,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      startedOn: event.startedOn.value,
    }),
  }),
])
export class HabitOutbox {}
