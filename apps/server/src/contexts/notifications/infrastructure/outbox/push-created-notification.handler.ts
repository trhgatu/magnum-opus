import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import {
  REALTIME_PORT,
  type IRealtimePort,
} from '@shared/application/ports/realtime.port';
import { REALTIME_EVENTS } from '@repo/contracts';
import { NotificationCreated } from '../../contracts/notification-created.contract';

type Payload = PayloadOf<typeof NotificationCreated>;

@Injectable()
@OutboxHandler(NotificationCreated)
export class PushCreatedNotificationHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(REALTIME_PORT) private readonly realtime: IRealtimePort,
  ) {}

  handle({ payload }: OutboxMessage<Payload>): Promise<void> {
    this.realtime.sendToUser(
      payload.userId,
      REALTIME_EVENTS.NOTIFICATION_RECEIVED,
      {
        ...payload,
        createdAt: payload.createdAt.toISOString(),
      },
    );
    return Promise.resolve();
  }
}
