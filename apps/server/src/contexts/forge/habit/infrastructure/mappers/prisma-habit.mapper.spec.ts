import {
  ForgeLifecycleAction as PrismaForgeLifecycleAction,
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
  HabitType as PrismaHabitType,
} from '@repo/database';

import { HabitFrequencyType, HabitType } from '../../domain/enums';
import {
  HabitLifecycleTransitionedEvent,
  HabitScheduleVersionStartedEvent,
} from '../../domain/events';
import { Habit } from '../../domain/habit.aggregate';
import { HabitCalendarDate, HabitFrequency } from '../../domain/value-objects';
import { PrismaHabitMapper } from './prisma-habit.mapper';

const TODAY = HabitCalendarDate.fromPersistenceDate(
  new Date('2026-10-09T00:00:00.000Z'),
);

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

  it('treats loaded-but-empty transitions as having no floor', () => {
    const habit = PrismaHabitMapper.toDomain({
      ...raw,
      lifecycleTransitions: [],
    });

    habit.archive(TODAY);

    const [event] =
      habit.getDomainEvents() as HabitLifecycleTransitionedEvent[];
    expect(event.effectiveOn.value).toBe('2026-10-09');
  });

  it('refuses archive/restore when the lifecycle floor was not loaded', () => {
    // Reader không nạp lifecycleTransitions: aggregate chỉ dùng để hiển thị.
    const active = PrismaHabitMapper.toDomain(raw);
    const archived = PrismaHabitMapper.toDomain({ ...raw, isActive: false });

    expect(() => active.archive(TODAY)).toThrow(
      'Habit lifecycle floor was not loaded',
    );
    expect(() => archived.restore(TODAY)).toThrow(
      'Habit lifecycle floor was not loaded',
    );
    expect(active.isActive).toBe(true);
    expect(active.revision).toBe(4);
    expect(active.getDomainEvents()).toEqual([]);
  });

  it.each([
    ['ARCHIVED', true, (habit: Habit) => habit.archive(TODAY)],
    ['RESTORED', false, (habit: Habit) => habit.restore(TODAY)],
  ] as const)(
    'maps a %s transition event to a persistence row',
    (action, isActive, change) => {
      const habit = PrismaHabitMapper.toDomain({
        ...raw,
        isActive,
        lifecycleTransitions: [],
      });
      change(habit);
      const [event] =
        habit.getDomainEvents() as HabitLifecycleTransitionedEvent[];

      expect(PrismaHabitMapper.transitionToPersistence(event)).toEqual({
        habitId: 'habit-id',
        ownerId: 'owner-id',
        action: PrismaForgeLifecycleAction[action],
        effectiveOn: new Date('2026-10-09T00:00:00.000Z'),
        occurredAt: event.occurredOn,
      });
    },
  );

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

  describe('schedule versions', () => {
    const changeToDaily = (habit: Habit, today = TODAY): void =>
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today,
      });

    it('uses the loaded open version as the effectiveFrom floor', () => {
      const habit = PrismaHabitMapper.toDomain({
        ...raw,
        scheduleVersions: [
          { effectiveFrom: new Date('2026-10-09T00:00:00.000Z') },
        ],
      });

      changeToDaily(
        habit,
        HabitCalendarDate.fromPersistenceDate(
          new Date('2026-10-08T00:00:00.000Z'),
        ),
      );

      const [event] =
        habit.getDomainEvents() as HabitScheduleVersionStartedEvent[];
      expect(event.effectiveFrom.value).toBe('2026-10-09');
    });

    it('treats loaded-but-empty versions as having no open version', () => {
      const habit = PrismaHabitMapper.toDomain({
        ...raw,
        scheduleVersions: [],
      });

      changeToDaily(habit);

      const [event] =
        habit.getDomainEvents() as HabitScheduleVersionStartedEvent[];
      expect(event.effectiveFrom.value).toBe('2026-10-09');
    });

    it('refuses a frequency change when the open version was not loaded', () => {
      // Reader không nạp scheduleVersions: aggregate chỉ dùng để hiển thị.
      const habit = PrismaHabitMapper.toDomain(raw);

      expect(() => changeToDaily(habit)).toThrow(
        'Habit schedule floor was not loaded',
      );
      expect(habit.revision).toBe(4);
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('maps a schedule version event to a persistence row', () => {
      const habit = PrismaHabitMapper.toDomain({
        ...raw,
        scheduleVersions: [{ effectiveFrom: createdOn }],
      });
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.weekly([7, 2]),
        today: TODAY,
      });
      const [event] =
        habit.getDomainEvents() as HabitScheduleVersionStartedEvent[];

      expect(PrismaHabitMapper.scheduleVersionToPersistence(event)).toEqual({
        habitId: 'habit-id',
        ownerId: 'owner-id',
        frequencyType: PrismaHabitFrequencyType.WEEKLY,
        frequencyDays: [2, 7],
        effectiveFrom: new Date('2026-10-09T00:00:00.000Z'),
      });
    });
  });
});
