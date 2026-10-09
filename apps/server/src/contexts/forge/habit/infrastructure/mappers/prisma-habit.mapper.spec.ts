import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
  HabitType as PrismaHabitType,
} from '@repo/database';

import { HabitFrequencyType, HabitType } from '../../domain/enums';
import { HabitLifecycleTransitionedEvent } from '../../domain/events';
import { HabitCalendarDate } from '../../domain/value-objects';
import { PrismaHabitMapper } from './prisma-habit.mapper';

describe('PrismaHabitMapper', () => {
  const createdAt = new Date('2026-08-20T10:00:00.000Z');
  const createdOn = new Date('2026-08-20T00:00:00.000Z');
  const updatedAt = new Date('2026-08-21T10:00:00.000Z');

  const raw: PrismaHabit = {
    id: 'habit-id',
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk without headphones',
    type: PrismaHabitType.BUILD,
    frequencyType: PrismaHabitFrequencyType.WEEKLY,
    frequencyDays: [1, 3, 5],
    quitStartedAt: null,
    isActive: true,
    revision: 4,
    createdAt,
    createdOn,
    updatedAt,
  };

  it('maps a Prisma record to the domain aggregate', () => {
    const habit = PrismaHabitMapper.toDomain(raw);

    expect(habit.toPrimitives()).toEqual({
      id: 'habit-id',
      ownerId: 'owner-id',
      title: 'Morning walk',
      description: 'Walk without headphones',
      type: HabitType.BUILD,
      frequencyType: HabitFrequencyType.WEEKLY,
      frequencyDays: [1, 3, 5],
      quitStartedAt: null,
      isActive: true,
      revision: 4,
      createdAt,
      createdOn: '2026-08-20',
      updatedAt,
    });
    expect(habit.getDomainEvents()).toEqual([]);
  });

  it('maps the domain aggregate back to persistence', () => {
    expect(
      PrismaHabitMapper.toPersistence(PrismaHabitMapper.toDomain(raw)),
    ).toEqual(raw);
  });

  it('uses the loaded latest transition as the effectiveOn floor', () => {
    const habit = PrismaHabitMapper.toDomain({
      ...raw,
      isActive: false,
      lifecycleTransitions: [
        { effectiveOn: new Date('2026-10-09T00:00:00.000Z') },
      ],
    });

    habit.restore(
      HabitCalendarDate.fromPersistenceDate(
        new Date('2026-10-08T00:00:00.000Z'),
      ),
    );

    const [event] =
      habit.getDomainEvents() as HabitLifecycleTransitionedEvent[];
    expect(event.effectiveOn.value).toBe('2026-10-09');
  });

  it('maps a lifecycle transition event to a persistence row', () => {
    const habit = PrismaHabitMapper.toDomain(raw);
    habit.archive(
      HabitCalendarDate.fromPersistenceDate(
        new Date('2026-10-09T00:00:00.000Z'),
      ),
    );
    const [event] =
      habit.getDomainEvents() as HabitLifecycleTransitionedEvent[];

    expect(PrismaHabitMapper.transitionToPersistence(event)).toEqual({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      action: 'ARCHIVED',
      effectiveOn: new Date('2026-10-09T00:00:00.000Z'),
      occurredAt: event.occurredOn,
    });
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

      expect(habit.frequency?.type).toBe(domainType);
      expect(habit.frequency?.days).toEqual(frequencyDays);
    },
  );

  it('maps a QUIT Prisma record with no frequency', () => {
    const quitStartedAt = new Date('2026-08-01');
    const habit = PrismaHabitMapper.toDomain({
      ...raw,
      type: PrismaHabitType.QUIT,
      frequencyType: null,
      frequencyDays: [],
      quitStartedAt,
    });

    expect(habit.type).toBe(HabitType.QUIT);
    expect(habit.frequency).toBeNull();
    expect(habit.quitStartedAt).toEqual(quitStartedAt);

    expect(PrismaHabitMapper.toPersistence(habit)).toEqual({
      ...raw,
      type: PrismaHabitType.QUIT,
      frequencyType: null,
      frequencyDays: [],
      quitStartedAt,
    });
  });
});
