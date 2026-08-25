import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
} from '@repo/database';

import { HabitFrequencyType } from '../../domain/enums';
import { PrismaHabitMapper } from './prisma-habit.mapper';

describe('PrismaHabitMapper', () => {
  const createdAt = new Date('2026-08-20T10:00:00.000Z');
  const updatedAt = new Date('2026-08-21T10:00:00.000Z');

  const raw: PrismaHabit = {
    id: 'habit-id',
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk without headphones',
    frequencyType: PrismaHabitFrequencyType.WEEKLY,
    frequencyDays: [1, 3, 5],
    isActive: true,
    revision: 4,
    createdAt,
    updatedAt,
  };

  it('maps a Prisma record to the domain aggregate', () => {
    const habit = PrismaHabitMapper.toDomain(raw);

    expect(habit.toPrimitives()).toEqual({
      id: 'habit-id',
      ownerId: 'owner-id',
      title: 'Morning walk',
      description: 'Walk without headphones',
      frequencyType: HabitFrequencyType.WEEKLY,
      frequencyDays: [1, 3, 5],
      isActive: true,
      revision: 4,
      createdAt,
      updatedAt,
    });
    expect(habit.getDomainEvents()).toEqual([]);
  });

  it('maps the domain aggregate back to persistence', () => {
    expect(
      PrismaHabitMapper.toPersistence(PrismaHabitMapper.toDomain(raw)),
    ).toEqual(raw);
  });

  it.each([
    [PrismaHabitFrequencyType.DAILY, HabitFrequencyType.DAILY, []],
    [PrismaHabitFrequencyType.WEEKLY, HabitFrequencyType.WEEKLY, [2, 6]],
  ])(
    'maps Prisma frequency %s to domain frequency %s',
    (prismaType, domainType, frequencyDays) => {
      const habit = PrismaHabitMapper.toDomain({
        ...raw,
        frequencyType: prismaType,
        frequencyDays,
      });

      expect(habit.frequency.type).toBe(domainType);
      expect(habit.frequency.days).toEqual(frequencyDays);
    },
  );
});
