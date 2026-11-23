import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { RoutineHabitAdded } from '../../contracts/routine-habit-added.contract';
import { RoutineHabitAddedEvent } from '../../domain';

@Injectable()
@OutboxPublisher([
  publish({
    event: RoutineHabitAddedEvent,
    as: RoutineHabitAdded,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      routineId: event.routineId,
      habitId: event.habitId,
      ownerId: event.ownerId,
      routineTitle: event.routineTitle,
    }),
  }),
])
export class RoutineOutbox {}
