import { Inject, Injectable } from '@nestjs/common';
import type {
  OutboxMessage,
  PayloadOf,
} from '@shared/application/integration-event';
import type { OutboxEventHandler } from '@infrastructure/event-bus/outbox/outbox-publication';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import {
  CACHE_PORT,
  type ICachePort,
} from '@shared/application/ports/cache.port';
import {
  JOB_QUEUE_PORT,
  type IJobQueuePort,
} from '@shared/application/ports/job-queue.port';
import {
  REALTIME_PORT,
  type IRealtimePort,
} from '@shared/application/ports/realtime.port';
import { REALTIME_EVENTS } from '@repo/contracts';
import { UserDeactivated } from '../../contracts/user-deactivated.contract';
import { USER_JOBS, USER_QUEUE } from '../../application/jobs/user-email.jobs';

type Payload = PayloadOf<typeof UserDeactivated>;

@Injectable()
@OutboxHandler(UserDeactivated)
export class EndDeactivatedUserAccessHandler implements OutboxEventHandler<Payload> {
  constructor(
    @Inject(CACHE_PORT) private readonly cache: ICachePort,
    @Inject(JOB_QUEUE_PORT) private readonly jobQueue: IJobQueuePort,
    @Inject(REALTIME_PORT) private readonly realtime: IRealtimePort,
  ) {}

  async handle({ eventId, payload }: OutboxMessage<Payload>): Promise<void> {
    this.realtime.sendToUser(payload.userId, REALTIME_EVENTS.FORCE_LOGOUT, {
      message: 'Your account has been deactivated.',
    });
    await Promise.all([
      this.cache.invalidatePattern(`refresh_token:${payload.userId}:*`),
      this.jobQueue.addJob(
        USER_QUEUE,
        USER_JOBS.SEND_DEACTIVATION_EMAIL,
        { email: payload.email },
        { jobId: eventId },
      ),
    ]);
  }
}
