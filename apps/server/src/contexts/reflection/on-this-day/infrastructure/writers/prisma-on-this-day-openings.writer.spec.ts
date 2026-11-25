import { outboxSerializerFor } from '@infrastructure/event-bus/outbox/testing/outbox-serializer.testing';

import { OnThisDayItemOpenedEvent } from '../../domain/events/on-this-day-item-opened.event';
import { OnThisDayOutbox } from '../outbox/on-this-day.outbox';
import { PrismaOnThisDayOpeningsWriter } from './prisma-on-this-day-openings.writer';

describe('PrismaOnThisDayOpeningsWriter', () => {
  it('writes the opening to the outbox', async () => {
    const outboxEvent = { create: jest.fn() };
    const writer = new PrismaOnThisDayOpeningsWriter(
      { outboxEvent } as never,
      outboxSerializerFor(OnThisDayOutbox),
    );
    const openedAt = new Date('2026-11-25T03:00:00.000Z');

    await writer.record(
      new OnThisDayItemOpenedEvent('owner-id', 'MEMORY', 'memory-id', openedAt),
    );

    expect(outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'reflection.on-this-day.item-opened.v1',
        aggregateId: 'memory-id',
        payload: {
          ownerId: 'owner-id',
          kind: 'MEMORY',
          itemId: 'memory-id',
          openedAt: openedAt.toISOString(),
        },
      }),
    });
  });
});
