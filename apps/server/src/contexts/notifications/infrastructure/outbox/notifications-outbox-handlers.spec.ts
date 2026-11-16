import type { IRealtimePort } from '@shared/application/ports/realtime.port';
import { OutboxHandler } from '@infrastructure/event-bus/outbox/outbox.decorators';
import { UserDeactivated } from '@iam/users/contracts/user-deactivated.contract';
import { UserRegistered } from '@iam/users/contracts/user-registered.contract';

import type { CreateNotificationService } from '../../application/services/create-notification.service';
import { NotificationCreated } from '../../contracts/notification-created.contract';

import { NotifyDeactivatedUserHandler } from './notify-deactivated-user.handler';
import { PushCreatedNotificationHandler } from './push-created-notification.handler';
import { WelcomeRegisteredUserHandler } from './welcome-registered-user.handler';

const notifications = {
  execute: jest.fn().mockResolvedValue('id'),
} as unknown as jest.Mocked<CreateNotificationService>;
const realtime = {
  sendToUser: jest.fn(),
} as unknown as jest.Mocked<IRealtimePort>;
const occurredAt = new Date();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notification outbox handlers', () => {
  it.each([
    [WelcomeRegisteredUserHandler, UserRegistered],
    [NotifyDeactivatedUserHandler, UserDeactivated],
    [PushCreatedNotificationHandler, NotificationCreated],
  ])('%p listens to its event', (handler, event) => {
    expect(Reflect.getMetadata(OutboxHandler.KEY, handler)).toBe(event);
  });
});

describe('WelcomeRegisteredUserHandler', () => {
  it('creates the welcome notification with the event id, so a replay is a no-op', async () => {
    await new WelcomeRegisteredUserHandler(notifications).handle({
      eventId: 'event-id',
      occurredAt,
      payload: {
        userId: 'user-id',
        email: 'user@example.com',
        username: 'user',
      },
    });

    expect(notifications.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-id',
        userId: 'user-id',
        type: 'SUCCESS',
      }),
    );
  });
});

describe('NotifyDeactivatedUserHandler', () => {
  it('creates the deactivation warning with the event id', async () => {
    await new NotifyDeactivatedUserHandler(notifications).handle({
      eventId: 'event-id',
      occurredAt,
      payload: { userId: 'user-id', email: 'user@example.com' },
    });

    expect(notifications.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-id',
        userId: 'user-id',
        type: 'WARNING',
      }),
    );
  });
});

describe('PushCreatedNotificationHandler', () => {
  it('pushes the notification to its owner with an ISO date', async () => {
    const createdAt = new Date('2026-11-16T03:00:00.000Z');

    await new PushCreatedNotificationHandler(realtime).handle({
      eventId: 'event-id',
      occurredAt,
      payload: {
        id: 'notification-id',
        userId: 'user-id',
        title: 'Title',
        content: 'Content',
        type: 'INFO',
        isRead: false,
        createdAt,
      },
    });

    expect(realtime.sendToUser).toHaveBeenCalledWith(
      'user-id',
      'notification_received',
      {
        id: 'notification-id',
        userId: 'user-id',
        title: 'Title',
        content: 'Content',
        type: 'INFO',
        isRead: false,
        createdAt: '2026-11-16T03:00:00.000Z',
      },
    );
  });
});
