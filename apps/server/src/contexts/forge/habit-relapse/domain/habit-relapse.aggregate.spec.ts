import { HabitRelapsedEvent } from './events';
import { HabitRelapse } from './habit-relapse.aggregate';

describe('HabitRelapse', () => {
  it('creates a relapse with a generated ID', () => {
    const occurredAt = new Date('2026-08-20T10:00:00.000Z');
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt,
      relapsedOn: '2026-08-20',
      createdAt: occurredAt,
    });

    expect(relapse.id).toBeTruthy();
    expect(relapse.habitId).toBe('habit-id');
    expect(relapse.ownerId).toBe('owner-id');
    expect(relapse.occurredAt).toEqual(occurredAt);
  });

  it("records a relapse event on the owner's calendar day", () => {
    // 18:00Z ngày 20 đã là ngày 21 ở UTC+7; handler tính ngày, aggregate giữ nguyên.
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T18:00:00.000Z'),
      relapsedOn: '2026-08-21',
      createdAt: new Date('2026-08-20T18:00:00.000Z'),
    });

    const events = relapse.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(HabitRelapsedEvent);
    expect(events[0]).toMatchObject({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      relapsedOn: '2026-08-21',
    });
  });

  it('generates distinct IDs for repeated relapses on the same Habit', () => {
    const first = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T10:00:00.000Z'),
      relapsedOn: '2026-08-20',
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    });
    const second = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T11:00:00.000Z'),
      relapsedOn: '2026-08-20',
      createdAt: new Date('2026-08-20T11:00:00.000Z'),
    });

    expect(first.id).not.toBe(second.id);
  });

  it('converts to persistence primitives without the calendar day', () => {
    const occurredAt = new Date('2026-08-20T10:00:00.000Z');
    const createdAt = new Date('2026-08-20T10:00:01.000Z');
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt,
      relapsedOn: '2026-08-20',
      createdAt,
    });

    expect(relapse.toPrimitives()).toEqual({
      id: relapse.id,
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt,
      createdAt,
    });
  });
});
