import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { NotificationCreatedEvent } from '../../domain/events/notification-created.event';
import { NotificationCreated } from '../../contracts/notification-created.contract';

@Injectable()
@OutboxPublisher([
  publish({
    event: NotificationCreatedEvent,
    as: NotificationCreated,
    aggregateId: (event) => event.id,
    toPayload: (event) => ({
      id: event.id,
      userId: event.userId,
      title: event.title,
      content: event.content,
      type: event.type,
      isRead: event.isRead,
      createdAt: event.createdAt.toISOString(),
    }),
  }),
])
export class NotificationsOutbox {}
