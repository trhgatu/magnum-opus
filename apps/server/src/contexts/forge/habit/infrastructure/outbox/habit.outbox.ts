import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { HabitPermanentlyDeleted } from '../../contracts/habit-permanently-deleted.contract';
import {
  HabitPermanentlyDeletedEvent,
  HabitRenamedEvent,
} from '../../domain/events';

import { HabitCreated } from '../../contracts/habit-created.contract';
import { HabitQuitStartChanged } from '../../contracts/habit-quit-start-changed.contract';

import { HabitCreatedEvent } from '../../domain/events';
import { HabitQuitStartChangedEvent } from '../../domain/events';

import { HabitLifecycleTransitioned } from '../../contracts/habit-lifecycle-transitioned.contract';
import { HabitLifecycleTransitionedEvent } from '../../domain/events';

import { HabitTrashed } from '../../contracts/habit-trashed.contract';
import { HabitTrashedEvent } from '../../domain/events';

import { HabitRestoredFromTrash } from '../../contracts/habit-restored-from-trash.contract';
import { HabitRestoredFromTrashEvent } from '../../domain/events';

import { HabitScheduleVersionStarted } from '../../contracts/habit-schedule-version-started.contract';
import { HabitScheduleVersionStartedEvent } from '../../domain/events';
import { HabitRenamed } from '../../contracts/habit-renamed.contract';

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

  publish({
    event: HabitLifecycleTransitionedEvent,
    as: HabitLifecycleTransitioned,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      action: event.action,
      effectiveOn: event.effectiveOn.value,
    }),
  }),

  publish({
    event: HabitTrashedEvent,
    as: HabitTrashed,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({ habitId: event.habitId, ownerId: event.ownerId }),
  }),

  publish({
    event: HabitRestoredFromTrashEvent,
    as: HabitRestoredFromTrash,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({ habitId: event.habitId, ownerId: event.ownerId }),
  }),

  publish({
    event: HabitScheduleVersionStartedEvent,
    as: HabitScheduleVersionStarted,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      frequencyType: event.frequency.type,
      frequencyDays: event.frequency.days,
      effectiveFrom: event.effectiveFrom.value,
    }),
  }),

  publish({
    event: HabitRenamedEvent,
    as: HabitRenamed,
    aggregateId: (event) => event.habitId,
    toPayload: (event) => ({
      habitId: event.habitId,
      ownerId: event.ownerId,
      title: event.title,
    }),
  }),
])
export class HabitOutbox {}
