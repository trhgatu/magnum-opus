import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OutboxPublisherService } from './outbox-publisher.service';
import { NonRetryableOutboxError } from './non-retryable-outbox-error';
import { OutboxRegistry } from './outbox-registry';

describe('OutboxPublisherService', () => {
  const candidate = {
    id: 'event-id',
    type: 'iam.user.registered.v1',
    aggregateId: 'user-id',
    payload: {
      userId: 'user-id',
      email: 'user@example.com',
      username: 'user',
    },
    occurredAt: new Date(),
    status: 'PENDING',
    attempts: 0,
    availableAt: new Date(),
    lockedAt: null,
    processedAt: null,
    lastError: null,
    createdAt: new Date(),
  };

  const createPrismaMock = () =>
    ({
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([candidate]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(candidate),
      },
    }) as unknown as jest.Mocked<PrismaService>;

  it('claims, publishes and marks an event as published', async () => {
    const prisma = createPrismaMock();
    const router = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      knownTypes: jest.fn().mockReturnValue(['iam.user.registered.v1']),
    } as unknown as jest.Mocked<OutboxRegistry>;
    const service = new OutboxPublisherService(
      prisma,
      router,
      new ConfigService(),
    );

    await service.poll();

    expect(router.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-id' }),
    );
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-id' },
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    );
  });

  it('reschedules a failed publication with an error message', async () => {
    const prisma = createPrismaMock();
    const router = {
      dispatch: jest.fn().mockRejectedValue(new Error('delivery unavailable')),
      knownTypes: jest.fn().mockReturnValue(['iam.user.registered.v1']),
    } as unknown as jest.Mocked<OutboxRegistry>;
    const service = new OutboxPublisherService(
      prisma,
      router,
      new ConfigService(),
    );

    await service.poll();

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-id' },
        data: expect.objectContaining({
          status: 'PENDING',
          lastError: 'delivery unavailable',
        }),
      }),
    );
  });

  const routerThatFails = (error: Error) =>
    ({
      dispatch: jest.fn().mockRejectedValue(error),
      knownTypes: jest.fn().mockReturnValue(['iam.user.registered.v1']),
    }) as unknown as jest.Mocked<OutboxRegistry>;

  // Lúc deploy, instance cũ chạy song song instance mới: nó không được lấy
  // row có type mà code của nó chưa biết.
  it('claims only types this build can handle', async () => {
    const prisma = createPrismaMock();
    const service = new OutboxPublisherService(
      prisma,
      routerThatFails(new Error('unused')),
      new ConfigService(),
    );
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await service.poll();

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: ['iam.user.registered.v1'] },
        }),
      }),
    );
  });

  it('gives up at once on an error that retrying cannot fix', async () => {
    const prisma = createPrismaMock();
    const service = new OutboxPublisherService(
      prisma,
      routerThatFails(new NonRetryableOutboxError('thingId must be a string')),
      new ConfigService(),
    );
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await service.poll();

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-id' },
        data: expect.objectContaining({
          status: 'FAILED',
          lastError: 'thingId must be a string',
        }),
      }),
    );
  });

  // Row kẹt ở PROCESSING nghĩa là process chết giữa chừng. Đã thử đủ số lần
  // mà vẫn trả về PENDING thì handler đó sẽ làm sập app mãi.
  it('fails stale claims that used every attempt and releases the rest', async () => {
    const prisma = createPrismaMock();
    (prisma.outboxEvent.findMany as jest.Mock).mockResolvedValue([]);
    const service = new OutboxPublisherService(
      prisma,
      routerThatFails(new Error('unused')),
      new ConfigService(),
    );

    await service.poll();

    expect(
      (prisma.outboxEvent.updateMany as jest.Mock).mock.calls.map(
        ([args]: [unknown]) => args,
      ),
    ).toEqual([
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PROCESSING',
          attempts: { gte: 10 },
        }),
        data: expect.objectContaining({ status: 'FAILED', lockedAt: null }),
      }),
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PROCESSING',
          attempts: { lt: 10 },
        }),
        data: expect.objectContaining({ status: 'PENDING', lockedAt: null }),
      }),
    ]);
  });

  it('backs off and stops spamming logs while the database is unreachable', async () => {
    const prisma = {
      outboxEvent: {
        updateMany: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    const router = {
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<OutboxRegistry>;
    const service = new OutboxPublisherService(
      prisma,
      router,
      new ConfigService(),
    );
    const errorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);

    await service.poll();
    // Các nhịp quét ngay sau đó rơi vào cửa sổ chờ: không chạm database,
    // không ghi thêm log.
    await service.poll();
    await service.poll();

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('deletes only published events older than the retention window', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 7 });
    const prisma = {
      outboxEvent: { deleteMany },
    } as unknown as jest.Mocked<PrismaService>;
    const service = new OutboxPublisherService(
      prisma,
      {} as unknown as jest.Mocked<OutboxRegistry>,
      new ConfigService(),
    );

    const removed = await service.cleanupPublished(30);

    expect(removed).toBe(7);
    const where = deleteMany.mock.calls[0][0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.processedAt.lt).toBeInstanceOf(Date);
  });
});
