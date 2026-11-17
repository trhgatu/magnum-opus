import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { OutboxPublisherService } from '../src/infrastructure/event-bus/outbox/outbox-publisher.service';
import type {
  OutboxRegistry,
  PersistedOutboxEvent,
} from '../src/infrastructure/event-bus/outbox/outbox-registry';

// Type riêng của test: publisher của app thật (nếu có) không biết type này
// nên không đụng vào các row ở đây.
const TYPE = 'test.outbox-order.v1';
const HOUR_MS = 60 * 60 * 1_000;

describe('Outbox ordering per aggregate (E2E)', () => {
  let prisma: PrismaService;
  let delivered: string[];
  let publisher: OutboxPublisherService;

  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService());
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({ where: { type: TYPE } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany({ where: { type: TYPE } });
    delivered = [];
    const registry = {
      knownTypes: () => [TYPE],
      dispatch: (event: PersistedOutboxEvent) => {
        delivered.push(event.id);
        return Promise.resolve();
      },
    } as unknown as OutboxRegistry;
    publisher = new OutboxPublisherService(
      prisma,
      registry,
      new ConfigService(),
    );
  });

  // Ghi lần lượt từng row để sequence tăng đúng theo thứ tự trong mảng.
  const insert = async (
    rows: {
      id: string;
      aggregateId: string | null;
      status?: string;
      availableAt?: Date;
    }[],
  ) => {
    for (const row of rows) {
      await prisma.outboxEvent.create({
        data: {
          id: row.id,
          type: TYPE,
          aggregateId: row.aggregateId,
          payload: {},
          occurredAt: new Date(),
          status: row.status ?? 'PENDING',
          availableAt: row.availableAt ?? new Date(Date.now() - 1_000),
        },
      });
    }
  };

  it('holds a later event while an earlier one of the same aggregate waits to retry', async () => {
    await insert([
      {
        id: 'a-1',
        aggregateId: 'habit-a',
        availableAt: new Date(Date.now() + HOUR_MS),
      },
      { id: 'a-2', aggregateId: 'habit-a' },
      { id: 'b-1', aggregateId: 'habit-b' },
    ]);

    await publisher.poll();

    expect(delivered).toEqual(['b-1']);
  });

  it('holds every later event of an aggregate behind a FAILED one', async () => {
    await insert([
      { id: 'a-1', aggregateId: 'habit-a', status: 'FAILED' },
      { id: 'a-2', aggregateId: 'habit-a' },
    ]);

    await publisher.poll();

    expect(delivered).toEqual([]);
  });

  it('delivers one aggregate in sequence order, one event per poll', async () => {
    await insert([
      { id: 'a-1', aggregateId: 'habit-a', status: 'PUBLISHED' },
      { id: 'a-2', aggregateId: 'habit-a' },
      { id: 'a-3', aggregateId: 'habit-a' },
    ]);

    await publisher.poll();
    await publisher.poll();

    expect(delivered).toEqual(['a-2', 'a-3']);
  });

  // Lúc deploy, instance cũ chạy song song instance mới: nó không được lấy
  // row có type mà code của nó chưa biết.
  it('leaves rows of a type this build does not know', async () => {
    await insert([{ id: 'a-1', aggregateId: 'habit-a' }]);
    await prisma.outboxEvent.create({
      data: {
        id: 'x-1',
        type: 'test.outbox-order.unknown.v1',
        payload: {},
        occurredAt: new Date(),
        availableAt: new Date(Date.now() - 1_000),
      },
    });

    try {
      await publisher.poll();
      expect(delivered).toEqual(['a-1']);
      expect(
        await prisma.outboxEvent.findUniqueOrThrow({ where: { id: 'x-1' } }),
      ).toEqual(expect.objectContaining({ status: 'PENDING', attempts: 0 }));
    } finally {
      await prisma.outboxEvent.delete({ where: { id: 'x-1' } });
    }
  });

  it('does not order events without an aggregate', async () => {
    await insert([
      {
        id: 'n-1',
        aggregateId: null,
        availableAt: new Date(Date.now() + HOUR_MS),
      },
      { id: 'n-2', aggregateId: null },
    ]);

    await publisher.poll();

    expect(delivered).toEqual(['n-2']);
  });
});
