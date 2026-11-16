import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';
import type { OutboxPublication } from '@infrastructure/event-bus/outbox/outbox-publication';

import { HabitPermanentlyDeleted } from '../../contracts/habit-permanently-deleted.contract';
import { HabitPermanentlyDeletedEvent } from '../../domain/events';

import { HabitOutbox } from './habit.outbox';

const publications = (): OutboxPublication[] =>
  Reflect.getMetadata(OutboxPublisher.KEY, HabitOutbox) as OutboxPublication[];

describe('HabitOutbox', () => {
  it('publishes HabitPermanentlyDeleted under its persisted type', () => {
    const [publication] = publications();

    expect(publication.event).toBe(HabitPermanentlyDeletedEvent);
    // Chuỗi này đã nằm trong DB: không bao giờ đổi.
    expect(publication.as.type).toBe('forge.habit.permanently-deleted.v1');
  });

  it('round-trips the ids through the outbox payload', () => {
    const [publication] = publications();
    const event = new HabitPermanentlyDeletedEvent('habit-id', 'owner-id');

    expect(publication.aggregateId(event)).toBe('habit-id');
    expect(HabitPermanentlyDeleted.parse(publication.toPayload(event))).toEqual(
      { habitId: 'habit-id', ownerId: 'owner-id' },
    );
  });
});
