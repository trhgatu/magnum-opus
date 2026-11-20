import { HabitCheckInUndoneEvent, HabitCheckedInEvent } from './events';
import { HabitCheckIn } from './habit-check-in.aggregate';
import { HabitCheckInDate, HabitCheckInId } from './value-objects';

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

  // Các nơi khác (Garden) biết có một lần chăm qua event này.
  it('announces the check-in on its calendar date', () => {
    const checkIn = HabitCheckIn.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: HabitCheckInDate.create('2026-08-25'),
      createdAt: new Date('2026-08-25T03:00:00.000Z'),
    });

    const events = checkIn.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(HabitCheckedInEvent);
    expect(events[0]).toMatchObject({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: HabitCheckInDate.create('2026-08-25'),
    });
  });

  it('announces nothing when rehydrated from storage', () => {
    expect(rehydrated().getDomainEvents()).toEqual([]);
  });

  it('announces an undo for the same Habit and date', () => {
    const checkIn = rehydrated();

    checkIn.undo();

    const events = checkIn.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(HabitCheckInUndoneEvent);
    expect(events[0]).toMatchObject({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: HabitCheckInDate.create('2026-08-24'),
    });
  });
});

function rehydrated(): HabitCheckIn {
  return HabitCheckIn.rehydrate({
    id: HabitCheckInId.create('72b45d9d-7ac6-4ec8-b3bc-5d67134b9676'),
    habitId: 'habit-id',
    ownerId: 'owner-id',
    date: HabitCheckInDate.create('2026-08-24'),
    createdAt: new Date('2026-08-24T09:15:00.000Z'),
  });
}
