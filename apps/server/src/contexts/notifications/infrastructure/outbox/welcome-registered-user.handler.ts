import { Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { UserRegistered } from '@iam/users/contracts/user-registered.contract';
import { CreateNotificationService } from '../../application/services/create-notification.service';

type Payload = PayloadOf<typeof UserRegistered>;

@Injectable()
@OutboxHandler(UserRegistered)
export class WelcomeRegisteredUserHandler implements OutboxEventHandler<Payload> {
  constructor(private readonly notifications: CreateNotificationService) {}

  async handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    await this.notifications.execute({
      id: eventId,
      userId: payload.userId,
      title: 'Welcome!',
      content: `Welcome ${payload.username} (${payload.email}) to the administration system.`,
      type: 'SUCCESS',
    });
  }
}
