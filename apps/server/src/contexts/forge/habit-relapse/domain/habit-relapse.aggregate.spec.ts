import { HabitRelapse } from './habit-relapse.aggregate';

describe('HabitRelapse', () => {
  it('creates a relapse with a generated ID', () => {
    const occurredAt = new Date('2026-08-20T10:00:00.000Z');
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt,
      createdAt: occurredAt,
    });

    expect(relapse.id).toBeTruthy();
    expect(relapse.habitId).toBe('habit-id');
    expect(relapse.ownerId).toBe('owner-id');
    expect(relapse.occurredAt).toEqual(occurredAt);
    expect(relapse.getDomainEvents()).toEqual([]);
  });

  it('generates distinct IDs for repeated relapses on the same Habit', () => {
    const first = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T10:00:00.000Z'),
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    });
    const second = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T11:00:00.000Z'),
      createdAt: new Date('2026-08-20T11:00:00.000Z'),
    });

    expect(first.id).not.toBe(second.id);
  });

  it('converts to persistence primitives', () => {
    const occurredAt = new Date('2026-08-20T10:00:00.000Z');
    const createdAt = new Date('2026-08-20T10:00:01.000Z');
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt,
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
