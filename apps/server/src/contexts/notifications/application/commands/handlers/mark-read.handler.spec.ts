import { MarkNotificationReadCommand } from '../mark-read.command';
import { MarkNotificationReadHandler } from './mark-read.handler';

describe('MarkNotificationReadHandler', () => {
  it('returns a typed not-found error', async () => {
    const repository = {
      findByIdForOwner: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      markAllAsRead: jest.fn(),
    };
    const handler = new MarkNotificationReadHandler(repository as never);

    const result = await handler.execute(
      new MarkNotificationReadCommand({
        userId: 'user-1',
        notificationId: 'missing',
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatchObject({
      error: { code: 'NOTIFICATION_NOT_FOUND', statusCode: 404 },
    });
  });

  it('does not reveal whether a missing notification belongs to another user', async () => {
    const repository = {
      findByIdForOwner: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      markAllAsRead: jest.fn(),
    };
    const handler = new MarkNotificationReadHandler(repository as never);

    const result = await handler.execute(
      new MarkNotificationReadCommand({
        userId: 'user-1',
        notificationId: 'notification-1',
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toMatchObject({
      error: { code: 'NOTIFICATION_NOT_FOUND', statusCode: 404 },
    });
    expect(repository.findByIdForOwner).toHaveBeenCalledWith(
      'notification-1',
      'user-1',
    );
  });

  it('marks one owned notification as read atomically', async () => {
    const markAsRead = jest.fn();
    const notification = { markAsRead };
    const repository = {
      findByIdForOwner: jest.fn().mockResolvedValue(notification),
      update: jest.fn(),
      markAllAsRead: jest.fn(),
    };
    const handler = new MarkNotificationReadHandler(repository as never);

    const result = await handler.execute(
      new MarkNotificationReadCommand({
        userId: 'user-1',
        notificationId: 'notification-1',
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(markAsRead).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(notification);
  });
});
