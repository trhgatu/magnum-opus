import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { JOB_QUEUE_PORT, type IJobQueuePort } from '@shared/application/ports';
import { UserRegistered } from '@iam/users/contracts/user-registered.contract';
import {
  USER_JOBS,
  USER_QUEUE,
} from '@iam/users/application/jobs/user-email.jobs';

type Payload = PayloadOf<typeof UserRegistered>;

@Injectable()
@OutboxHandler(UserRegistered)
export class SendWelcomeEmailHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(JOB_QUEUE_PORT) private readonly jobQueue: IJobQueuePort,
  ) {}

  async handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    await this.jobQueue.addJob(
      USER_QUEUE,
      USER_JOBS.SEND_WELCOME_EMAIL,
      { email: payload.email },
      { jobId: eventId },
    );
  }
}
