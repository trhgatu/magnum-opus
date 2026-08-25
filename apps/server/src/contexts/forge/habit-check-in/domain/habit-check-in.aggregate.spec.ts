import { HabitCheckIn } from './habit-check-in.aggregate';
import { HabitCheckInDate } from './value-objects';

describe('HabitCheckIn', () => {
  it('creates an immutable owner-scoped daily record', () => {
    const createdAt = new Date('2026-08-25T03:00:00.000Z');
    const checkIn = HabitCheckIn.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: HabitCheckInDate.create('2026-08-25'),
      createdAt,
    });

    expect(checkIn.toPrimitives()).toMatchObject({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: '2026-08-25',
      createdAt,
    });
    expect(checkIn.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
