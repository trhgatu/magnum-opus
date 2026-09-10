import { HabitRelapse as PrismaHabitRelapse } from '@repo/database';

import { PrismaHabitRelapseMapper } from './prisma-habit-relapse.mapper';

describe('PrismaHabitRelapseMapper', () => {
  const raw: PrismaHabitRelapse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    habitId: 'habit-id',
    ownerId: 'owner-id',
    occurredAt: new Date('2026-08-20T10:00:00.000Z'),
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
  };

  it('maps a Prisma record to the domain entity', () => {
    const relapse = PrismaHabitRelapseMapper.toDomain(raw);

    expect(relapse.toPrimitives()).toEqual({
      id: raw.id,
      habitId: raw.habitId,
      ownerId: raw.ownerId,
      occurredAt: raw.occurredAt,
      createdAt: raw.createdAt,
    });
  });

  it('maps the domain entity back to persistence', () => {
    expect(
      PrismaHabitRelapseMapper.toPersistence(
        PrismaHabitRelapseMapper.toDomain(raw),
      ),
    ).toEqual(raw);
  });
});
