import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { HabitCheckInUndone } from '../../contracts/habit-check-in-undone.contract';
import { HabitCheckedIn } from '../../contracts/habit-checked-in.contract';
import {
  HabitCheckInUndoneEvent,
  HabitCheckedInEvent,
} from '../../domain/events';

@Injectable()
@OutboxPublisher([
  publish({
    event: HabitCheckedInEvent,
    as: HabitCheckedIn,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      date: event.date.value,
    }),
  }),
  publish({
    event: HabitCheckInUndoneEvent,
    as: HabitCheckInUndone,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      date: event.date.value,
    }),
  }),
])
export class HabitCheckInOutbox {}
