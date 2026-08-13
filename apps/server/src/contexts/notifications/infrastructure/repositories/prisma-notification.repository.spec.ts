import { Prisma } from '@repo/database';

import { NotificationEntity } from '../../domain/notification.entity';
import { PrismaNotificationRepository } from './prisma-notification.repository';

describe('PrismaNotificationRepository', () => {
  const notification = {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  };
  const outboxEvent = { createMany: jest.fn() };
  const prisma = {
    notification,
    outboxEvent,
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    ),
  };
  const repository = new PrismaNotificationRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates the notification and its outbox event in one transaction', async () => {
    notification.create.mockResolvedValue(rawNotification());
    outboxEvent.createMany.mockResolvedValue({ count: 1 });

    const created = await repository.createIfAbsent(newNotification());

    expect(created).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'notification-1',
        userId: 'user-1',
        isRead: false,
      }),
    });
    expect(outboxEvent.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ aggregateId: 'notification-1' })],
    });
  });

  it('maps a duplicate notification id to idempotent false', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['id'] },
      }),
    );

    await expect(repository.createIfAbsent(newNotification())).resolves.toBe(
      false,
    );
  });

  it('does not hide a unique conflict from another transaction write', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['event_id'] },
    });
    prisma.$transaction.mockRejectedValueOnce(conflict);

    await expect(repository.createIfAbsent(newNotification())).rejects.toBe(
      conflict,
    );
  });

  it('scopes a single-notification lookup by both id and owner', async () => {
    notification.findFirst.mockResolvedValue(rawNotification());

    const found = await repository.findByIdForOwner('notification-1', 'user-1');

    expect(notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notification-1', userId: 'user-1' },
    });
    expect(found?.id).toBe('notification-1');
  });

  it('updates only mutable aggregate state', async () => {
    notification.update.mockResolvedValue(rawNotification({ isRead: true }));
    const aggregate = NotificationEntity.create(
      rawNotification({ isRead: true }),
    );

    await repository.update(aggregate);

    expect(notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { isRead: true },
    });
  });

  const newNotification = (): NotificationEntity =>
    NotificationEntity.createNew({
      id: 'notification-1',
      userId: 'user-1',
      title: 'Title',
      content: 'Content',
    });

  const rawNotification = (overrides = {}) => ({
    id: 'notification-1',
    userId: 'user-1',
    title: 'Title',
    content: 'Content',
    type: 'INFO',
    isRead: false,
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
    ...overrides,
  });
});
