import type { ICachePort } from '@shared/application/ports/cache.port';
import type { IJobQueuePort } from '@shared/application/ports/job-queue.port';
import type { IRealtimePort } from '@shared/application/ports/realtime.port';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';

import { USER_JOBS, USER_QUEUE } from '../../application/jobs/user-email.jobs';
import { UserDeactivated } from '../../contracts/user-deactivated.contract';
import { UserRegistered } from '../../contracts/user-registered.contract';

import { EndDeactivatedUserAccessHandler } from './end-deactivated-user-access.handler';
import { SendWelcomeEmailHandler } from './send-welcome-email.handler';

const jobQueue = {
  addJob: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<IJobQueuePort>;
const cache = {
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<ICachePort>;
const realtime = {
  sendToUser: jest.fn(),
} as unknown as jest.Mocked<IRealtimePort>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SendWelcomeEmailHandler', () => {
  it('listens to UserRegistered', () => {
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, SendWelcomeEmailHandler),
    ).toBe(UserRegistered);
  });

  it('queues the welcome email once per event', async () => {
    await new SendWelcomeEmailHandler(jobQueue).handle({
      eventId: 'event-id',
      occurredAt: new Date(),
      payload: {
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
      },
    });

    expect(jobQueue.addJob).toHaveBeenCalledWith(
      USER_QUEUE,
      USER_JOBS.SEND_WELCOME_EMAIL,
      { email: 'user@example.com' },
      { jobId: 'event-id' },
    );
  });
});

describe('EndDeactivatedUserAccessHandler', () => {
  it('listens to UserDeactivated', () => {
    expect(
      Reflect.getMetadata(OutboxHandler.KEY, EndDeactivatedUserAccessHandler),
    ).toBe(UserDeactivated);
  });

  it('logs the user out, revokes sessions and queues the email once per event', async () => {
    await new EndDeactivatedUserAccessHandler(cache, jobQueue, realtime).handle(
      {
        eventId: 'event-id',
        occurredAt: new Date(),
        payload: { userId: 'user-id', email: 'user@example.com' },
      },
    );

    expect(realtime.sendToUser).toHaveBeenCalledWith(
      'user-id',
      'force_logout',
      expect.any(Object),
    );
    expect(cache.invalidatePattern).toHaveBeenCalledWith(
      'refresh_token:user-id:*',
    );
    expect(jobQueue.addJob).toHaveBeenCalledWith(
      USER_QUEUE,
      USER_JOBS.SEND_DEACTIVATION_EMAIL,
      { email: 'user@example.com' },
      { jobId: 'event-id' },
    );
  });
});
