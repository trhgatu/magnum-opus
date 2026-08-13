import type { ICachePort } from '@shared/application/ports/cache.port';
import type { IJobQueuePort } from '@shared/application/ports/job-queue.port';
import type { IRealtimePort } from '@shared/application/ports/realtime.port';
import type { CreateNotificationService } from '@/contexts/notifications/application/services/create-notification.service';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { NotificationCreatedEvent } from '@/contexts/notifications/domain/events/notification-created.event';
import {
  USER_JOBS,
  USER_QUEUE,
} from '@iam/users/application/jobs/user-email.jobs';
import { OutboxEventRouter } from './outbox-event.router';

describe('OutboxEventRouter', () => {
  const cache = {
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ICachePort>;
  const jobQueue = {
    addJob: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IJobQueuePort>;
  const realtime = {
    sendToUser: jest.fn(),
  } as unknown as jest.Mocked<IRealtimePort>;
  const notifications = {
    execute: jest.fn().mockResolvedValue('notification-id'),
  } as unknown as jest.Mocked<CreateNotificationService>;

  const router = new OutboxEventRouter(
    cache,
    jobQueue,
    realtime,
    notifications,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('awaits idempotent registration deliveries', async () => {
    const event = new UserRegisteredEvent(
      'user-id',
      'user@example.com',
      'user',
    );

    await router.dispatch(event);

    expect(jobQueue.addJob).toHaveBeenCalledWith(
      USER_QUEUE,
      USER_JOBS.SEND_WELCOME_EMAIL,
      { email: event.email },
      { jobId: event.eventId },
    );
    expect(notifications.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: event.eventId, userId: event.userId }),
    );
  });

  it('awaits session, email and notification deactivation deliveries', async () => {
    const event = new UserDeactivatedEvent('user-id', 'user@example.com');

    await router.dispatch(event);

    expect(cache.invalidatePattern).toHaveBeenCalledWith(
      'refresh_token:user-id:*',
    );
    expect(jobQueue.addJob).toHaveBeenCalledWith(
      USER_QUEUE,
      USER_JOBS.SEND_DEACTIVATION_EMAIL,
      { email: event.email },
      { jobId: event.eventId },
    );
    expect(realtime.sendToUser).toHaveBeenCalledWith(
      event.userId,
      'force_logout',
      expect.any(Object),
    );
  });

  it('routes created notifications to the owning user', async () => {
    const event = new NotificationCreatedEvent(
      'notification-id',
      'user-id',
      'Title',
      'Content',
      'INFO',
      false,
      new Date(),
    );

    await router.dispatch(event);

    expect(realtime.sendToUser).toHaveBeenCalledWith(
      event.userId,
      'notification_received',
      expect.objectContaining({ id: event.id }),
    );
  });
});
