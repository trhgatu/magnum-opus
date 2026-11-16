import { Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { UserDeactivated } from '@iam/users/contracts/user-deactivated.contract';
import { CreateNotificationService } from '../../application/services/create-notification.service';

type Payload = PayloadOf<typeof UserDeactivated>;

@Injectable()
@OutboxHandler(UserDeactivated)
export class NotifyDeactivatedUserHandler implements OutboxEventHandler<Payload> {
  constructor(private readonly notifications: CreateNotificationService) {}

  async handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    await this.notifications.execute({
      id: eventId,
      userId: payload.userId,
      title: 'Account deactivated',
      content: 'Your account has been deactivated by a system administrator.',
      type: 'WARNING',
    });
  }
}
