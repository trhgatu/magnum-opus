import { outboxSerializerFor } from '@infrastructure/event-bus/outbox/testing/outbox-serializer.testing';

import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitRelapseOutbox } from '../outbox/habit-relapse.outbox';
import { PrismaHabitRelapseRepository } from './prisma-habit-relapse.repository';

describe('PrismaHabitRelapseRepository', () => {
  const transaction = {
    habitRelapse: { create: jest.fn() },
    outboxEvent: { createMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((work: (tx: typeof transaction) => unknown) =>
      work(transaction),
    ),
  };
  const repository = new PrismaHabitRelapseRepository(
    prisma as never,
    outboxSerializerFor(HabitRelapseOutbox),
  );

  beforeEach(() => jest.clearAllMocks());

  it('persists the relapse and its outbox event in one transaction', async () => {
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T18:00:00.000Z'),
      relapsedOn: '2026-08-21',
      createdAt: new Date('2026-08-20T18:00:00.000Z'),
    });

    await repository.create(relapse);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.habitRelapse.create).toHaveBeenCalledWith({
      data: relapse.toPrimitives(),
    });
    expect(transaction.outboxEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          type: 'forge.habit.relapsed.v1',
          aggregateId: 'habit-id',
          payload: {
            habitId: 'habit-id',
            ownerId: 'owner-id',
            occurredOn: '2026-08-21',
          },
        }),
      ],
    });
  });
});
