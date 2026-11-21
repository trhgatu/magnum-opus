import { OutboxPublisher } from '@infrastructure/event-bus/outbox/outbox.decorators';
import type { OutboxPublication } from '@infrastructure/event-bus/outbox/outbox-publication';

import { HabitPermanentlyDeleted } from '../../contracts/habit-permanently-deleted.contract';
import { HabitScheduleVersionStarted } from '../../contracts/habit-schedule-version-started.contract';
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

describe('HabitScheduleVersionStarted', () => {
  const payload = {
    habitId: 'habit-id',
    ownerId: 'owner-id',
    frequencyType: 'WEEKLY',
    frequencyDays: [1, 3, 5],
    effectiveFrom: '2026-11-16',
  };

  it('reads the schedule a Garden rhythm needs', () => {
    expect(HabitScheduleVersionStarted.parse(payload)).toEqual({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      frequencyType: 'WEEKLY',
      frequencyDays: [1, 3, 5],
      effectiveFrom: new Date('2026-11-16T00:00:00.000Z'),
    });
  });

  it.each([
    ['an unknown frequency type', { frequencyType: 'MONTHLY' }],
    ['days that are not a list', { frequencyDays: '1,3' }],
    ['a day outside ISO weekdays', { frequencyDays: [0, 3] }],
    ['a day that is not a whole number', { frequencyDays: [1.5] }],
  ])('rejects %s', (_case, override) => {
    expect(() =>
      HabitScheduleVersionStarted.parse({ ...payload, ...override }),
    ).toThrow();
  });
});
