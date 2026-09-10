import { HabitRelapse as PrismaHabitRelapse } from '@repo/database';

import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitRelapseId } from '../../domain/value-objects';
import { PrismaHabitRelapseMapper } from './prisma-habit-relapse.mapper';

describe('PrismaHabitRelapseMapper', () => {
  const raw: PrismaHabitRelapse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    habitId: 'habit-id',
    ownerId: 'owner-id',
    occurredAt: new Date('2026-08-20T10:00:00.000Z'),
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
  };

  it('maps the domain entity to persistence', () => {
    const relapse = HabitRelapse.rehydrate({
      id: HabitRelapseId.create(raw.id),
      habitId: raw.habitId,
      ownerId: raw.ownerId,
      occurredAt: raw.occurredAt,
      createdAt: raw.createdAt,
    });

    expect(PrismaHabitRelapseMapper.toPersistence(relapse)).toEqual(raw);
  });
});
