import { HabitCheckIn as PrismaHabitCheckIn } from '@repo/database';

import { PrismaHabitCheckInMapper } from './prisma-habit-check-in.mapper';

describe('PrismaHabitCheckInMapper', () => {
  const createdAt = new Date('2026-08-24T09:15:00.000Z');

  const raw: PrismaHabitCheckIn = {
    id: '72b45d9d-7ac6-4ec8-b3bc-5d67134b9676',
    habitId: 'habit-id',
    ownerId: 'owner-id',
    date: new Date('2026-08-24T00:00:00.000Z'),
    createdAt,
  };

  it('maps a Prisma record to the domain aggregate', () => {
    const checkIn = PrismaHabitCheckInMapper.toDomain(raw);

    expect(checkIn.toPrimitives()).toEqual({
      id: raw.id,
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: '2026-08-24',
      createdAt,
    });
  });

  it('maps the domain aggregate back to persistence', () => {
    expect(
      PrismaHabitCheckInMapper.toPersistence(
        PrismaHabitCheckInMapper.toDomain(raw),
      ),
    ).toEqual(raw);
  });
});
