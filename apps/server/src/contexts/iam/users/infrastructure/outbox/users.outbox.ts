import { Injectable } from '@nestjs/common';
import { publish } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { UserRegistered } from '@iam/users/contracts/user-registered.contract';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';

import { UserDeactivated } from '@iam/users/contracts/user-deactivated.contract';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';

@Injectable()
@OutboxPublisher([
  publish({
    event: UserRegisteredEvent,
    as: UserRegistered,
    aggregateId: (event) => event.userId,
    toPayload: (event) => ({
      userId: event.userId,
      email: event.email,
      username: event.username,
    }),
  }),
  publish({
    event: UserDeactivatedEvent,
    as: UserDeactivated,
    aggregateId: (event) => event.userId,
    toPayload: (event) => ({ userId: event.userId, email: event.email }),
  }),
])
export class UsersOutbox {}
