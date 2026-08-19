import type { ICachePort } from '@shared/application/ports/cache.port';
import type { IJobQueuePort } from '@shared/application/ports/job-queue.port';
import type { IRealtimePort } from '@shared/application/ports/realtime.port';
import type { TimelineWriter } from '@reflection/timeline/application/ports/timeline-writer.port';
import type { CreateNotificationService } from '@/contexts/notifications/application/services/create-notification.service';
import { UserRegisteredEvent } from '@iam/users/domain/events/user-registered.event';
import { UserDeactivatedEvent } from '@iam/users/domain/events/user-deactivated.event';
import { NotificationCreatedEvent } from '@/contexts/notifications/domain/events/notification-created.event';
import { JournalEntrySealedEvent } from '@/contexts/reflection/journal/domain/events/journal-entry-sealed.event';
import { MemoryCreatedEvent } from '@/contexts/reflection/memory/domain/events/memory-created.event';

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
  const timelineWriter = {
    recordJournalSealed: jest.fn().mockResolvedValue(undefined),
    recordMemoryCreated: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TimelineWriter>;

  const router = new OutboxEventRouter(
    cache,
    jobQueue,
    realtime,
    notifications,
    timelineWriter,
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

  it('records a journal timeline entry when a Journal is sealed', async () => {
    const event = new JournalEntrySealedEvent(
      'entry-id',
      'owner-id',
      new Date(),
    );

    await router.dispatch(event);

    expect(timelineWriter.recordJournalSealed).toHaveBeenCalledWith(
      'owner-id',
      'entry-id',
      event.sealedAt,
    );
  });

  it('records a memory timeline entry when a Memory is created', async () => {
    const event = new MemoryCreatedEvent('memory-id', 'owner-id', null);

    await router.dispatch(event);

    expect(timelineWriter.recordMemoryCreated).toHaveBeenCalledWith(
      'owner-id',
      'memory-id',
      null,
    );
  });
});
