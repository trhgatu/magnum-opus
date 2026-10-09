import { HabitLifecycleAction, HabitType } from './enums';
import {
  HabitLifecycleTransitionedEvent,
  HabitScheduleVersionStartedEvent,
} from './events';
import {
  InvalidHabitTitleException,
  InvalidHabitTransitionException,
  InvalidHabitTypeException,
  InvalidQuitStartedAtException,
} from './exceptions';
import { Habit, type HabitProps } from './habit.aggregate';
import { HabitCalendarDate, HabitFrequency, HabitId } from './value-objects';

const calendarDate = (value: string): HabitCalendarDate =>
  HabitCalendarDate.fromPersistenceDate(new Date(`${value}T00:00:00.000Z`));

const TODAY = calendarDate('2026-10-09');

describe('Habit', () => {
  describe('create (BUILD)', () => {
    it('creates an active Habit at revision 1', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: '  Morning walk  ',
        description: '  Walk without headphones  ',
        type: HabitType.BUILD,
        frequency: HabitFrequency.daily(),
      });

      expect(habit.id).toBeTruthy();
      expect(habit.ownerId).toBe('owner-id');
      expect(habit.title).toBe('Morning walk');
      expect(habit.description).toBe('Walk without headphones');
      expect(habit.type).toBe(HabitType.BUILD);
      expect(habit.frequency?.equals(HabitFrequency.daily())).toBe(true);
      expect(habit.quitStartedAt).toBeNull();
      expect(habit.isActive).toBe(true);
      expect(habit.revision).toBe(1);
      expect(habit.createdAt).toEqual(habit.updatedAt);
      expect(habit.createdOn.value).toBe('2026-10-09');
      expect(lifecycleTransitions(habit)).toEqual([]);
    });

    it('starts the initial schedule version on createdOn', () => {
      const habit = createHabit({ frequency: HabitFrequency.weekly([5, 1]) });

      const [event] = habit.getDomainEvents();
      expect(event).toBeInstanceOf(HabitScheduleVersionStartedEvent);
      expect(event).toMatchObject({ habitId: habit.id, ownerId: 'owner-id' });
      expect(scheduleVersions(habit)).toEqual([
        { frequency: 'WEEKLY:1,5', effectiveFrom: '2026-10-09' },
      ]);
    });

    it('normalizes an omitted or blank description to null', () => {
      expect(createHabit().description).toBeNull();
      expect(createHabit({ description: '   ' }).description).toBeNull();
    });

    it('rejects a blank title', () => {
      expect(() => createHabit({ title: '   ' })).toThrow(
        InvalidHabitTitleException,
      );
    });

    it('rejects a title longer than 200 characters', () => {
      expect(() => createHabit({ title: 'a'.repeat(201) })).toThrow(
        InvalidHabitTitleException,
      );
    });

    it('rejects BUILD without a frequency', () => {
      expect(() =>
        Habit.create({
          ownerId: 'owner-id',
          today: TODAY,
          title: 'Morning walk',
          type: HabitType.BUILD,
        }),
      ).toThrow(InvalidHabitTypeException);
    });

    it('rejects BUILD with a quitStartedAt', () => {
      expect(() =>
        Habit.create({
          ownerId: 'owner-id',
          today: TODAY,
          title: 'Morning walk',
          type: HabitType.BUILD,
          frequency: HabitFrequency.daily(),
          quitStartedAt: new Date('2026-01-01'),
        }),
      ).toThrow(InvalidHabitTypeException);
    });
  });

  describe('create (QUIT)', () => {
    it('creates a QUIT Habit with no frequency', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
        quitStartedAt: new Date('2026-08-01'),
      });

      expect(habit.type).toBe(HabitType.QUIT);
      expect(habit.frequency).toBeNull();
      expect(habit.quitStartedAt).toEqual(new Date('2026-08-01'));
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('defaults quitStartedAt to today when omitted', () => {
      const before = new Date();

      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
      });

      const expected = new Date(
        Date.UTC(
          before.getUTCFullYear(),
          before.getUTCMonth(),
          before.getUTCDate(),
        ),
      );
      expect(habit.quitStartedAt).toEqual(expected);
    });

    it('rejects QUIT with a frequency', () => {
      expect(() =>
        Habit.create({
          ownerId: 'owner-id',
          today: TODAY,
          title: 'Quit smoking',
          type: HabitType.QUIT,
          frequency: HabitFrequency.daily(),
        }),
      ).toThrow(InvalidHabitTypeException);
    });

    it('rejects a quitStartedAt in the future', () => {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      expect(() =>
        Habit.create({
          ownerId: 'owner-id',
          today: TODAY,
          title: 'Quit smoking',
          type: HabitType.QUIT,
          quitStartedAt: tomorrow,
        }),
      ).toThrow(InvalidQuitStartedAtException);
    });

    it('normalizes a quitStartedAt with a time component to a canonical day', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
        quitStartedAt: new Date('2026-08-01T15:30:00.000Z'),
      });

      expect(habit.quitStartedAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    });

    it('rejects a runtime type that is neither BUILD nor QUIT', () => {
      expect(() =>
        Habit.create({
          ownerId: 'owner-id',
          today: TODAY,
          title: 'Quit smoking',
          type: 'SOMETHING_ELSE' as HabitType,
        }),
      ).toThrow(InvalidHabitTypeException);
    });
  });

  describe('update (BUILD)', () => {
    it('updates editable fields and increments revision', () => {
      const habit = createHabit();

      habit.update({
        title: '  Evening walk  ',
        description: '  After work  ',
        frequency: HabitFrequency.weekly([5, 1]),
        today: TODAY,
      });

      expect(habit.title).toBe('Evening walk');
      expect(habit.description).toBe('After work');
      expect(habit.frequency?.days).toEqual([1, 5]);
      expect(habit.revision).toBe(2);
    });

    it('does not increment revision for normalized equal values', () => {
      const habit = createHabit({
        description: 'Walk slowly',
        frequency: HabitFrequency.weekly([1, 5]),
      });

      habit.update({
        title: '  Morning walk  ',
        description: '  Walk slowly  ',
        frequency: HabitFrequency.weekly([5, 1]),
        today: TODAY,
      });

      expect(habit.revision).toBe(1);
    });

    it('validates all new values before changing state', () => {
      const habit = createHabit();

      expect(() =>
        habit.update({
          title: '   ',
          description: 'Changed',
          frequency: HabitFrequency.weekly([1]),
          today: TODAY,
        }),
      ).toThrow(InvalidHabitTitleException);
      expect(habit.title).toBe('Morning walk');
      expect(habit.description).toBeNull();
      expect(habit.revision).toBe(1);
    });

    it('rejects update missing frequency', () => {
      const habit = createHabit();

      expect(() =>
        habit.update({ title: 'Morning walk', today: TODAY }),
      ).toThrow(InvalidHabitTypeException);
    });

    it('rejects update carrying quitStartedAt', () => {
      const habit = createHabit();

      expect(() =>
        habit.update({
          title: 'Morning walk',
          frequency: HabitFrequency.daily(),
          quitStartedAt: new Date('2026-01-01'),
          today: TODAY,
        }),
      ).toThrow(InvalidHabitTypeException);
    });

    it('does not allow editing an archived Habit', () => {
      const habit = createHabit();
      habit.archive(TODAY);

      expect(() =>
        habit.update({
          title: 'Changed',
          frequency: HabitFrequency.daily(),
          today: TODAY,
        }),
      ).toThrow(InvalidHabitTransitionException);
    });
  });

  describe('update (QUIT)', () => {
    it('updates quitStartedAt while active', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
        quitStartedAt: new Date('2026-08-01'),
      });

      habit.update({
        title: 'Quit smoking',
        quitStartedAt: new Date('2026-08-15'),
        today: TODAY,
      });

      expect(habit.quitStartedAt).toEqual(new Date('2026-08-15'));
      expect(habit.revision).toBe(2);
    });

    it('normalizes a quitStartedAt with a time component to a canonical day', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
        quitStartedAt: new Date('2026-08-01'),
      });

      habit.update({
        title: 'Quit smoking',
        quitStartedAt: new Date('2026-08-15T09:45:00.000Z'),
        today: TODAY,
      });

      expect(habit.quitStartedAt).toEqual(new Date('2026-08-15T00:00:00.000Z'));
    });

    it('rejects update missing quitStartedAt', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
      });

      expect(() =>
        habit.update({ title: 'Quit smoking', today: TODAY }),
      ).toThrow(InvalidHabitTypeException);
    });

    it('rejects update carrying a frequency', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
      });

      expect(() =>
        habit.update({
          title: 'Quit smoking',
          frequency: HabitFrequency.daily(),
          quitStartedAt: new Date('2026-08-01'),
          today: TODAY,
        }),
      ).toThrow(InvalidHabitTypeException);
    });

    it('rejects a future quitStartedAt', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
      });
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      expect(() =>
        habit.update({
          title: 'Quit smoking',
          quitStartedAt: tomorrow,
          today: TODAY,
        }),
      ).toThrow(InvalidQuitStartedAtException);
    });
  });

  describe('archive and restore', () => {
    it('archives an active Habit', () => {
      const habit = createHabit();

      habit.archive(TODAY);

      expect(habit.isActive).toBe(false);
      expect(habit.revision).toBe(2);
    });

    it('restores an archived Habit', () => {
      const habit = createHabit();
      habit.archive(TODAY);

      habit.restore(TODAY);

      expect(habit.isActive).toBe(true);
      expect(habit.revision).toBe(3);
    });

    it('rejects archiving an archived Habit', () => {
      const habit = createHabit();
      habit.archive(TODAY);

      expect(() => habit.archive(TODAY)).toThrow(
        InvalidHabitTransitionException,
      );
    });

    it('rejects restoring an active Habit', () => {
      expect(() => createHabit().restore(TODAY)).toThrow(
        InvalidHabitTransitionException,
      );
    });

    it('records an ARCHIVED transition effective on the given calendar date', () => {
      const habit = createHabit();

      habit.archive(TODAY);

      const [event] = habit
        .getDomainEvents()
        .filter(
          (candidate) =>
            !(candidate instanceof HabitScheduleVersionStartedEvent),
        );
      expect(event).toBeInstanceOf(HabitLifecycleTransitionedEvent);
      expect(event).toMatchObject({
        habitId: habit.id,
        ownerId: 'owner-id',
        action: HabitLifecycleAction.ARCHIVED,
      });
      expect((event as HabitLifecycleTransitionedEvent).effectiveOn.value).toBe(
        '2026-10-09',
      );
    });

    it('records one transition per change, even on the same day', () => {
      const habit = createHabit();

      habit.archive(TODAY);
      habit.restore(TODAY);

      expect(lifecycleTransitions(habit)).toEqual([
        { action: HabitLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
        { action: HabitLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('records no transition when the change is rejected', () => {
      const habit = createHabit();

      expect(() => habit.restore(TODAY)).toThrow(
        InvalidHabitTransitionException,
      );
      expect(lifecycleTransitions(habit)).toEqual([]);
    });

    it('never moves effectiveOn before the latest recorded transition', () => {
      // Owner đổi múi giờ từ UTC+7 sang UTC-5: "hôm nay" mới sớm hơn mốc
      // đã ghi, transition bị kẹp về mốc đó để lịch sử không đảo thứ tự.
      const habit = Habit.rehydrate(
        createProps({
          isActive: false,
          createdOn: calendarDate('2026-10-01'),
          latestLifecycleEffectiveOn: calendarDate('2026-10-09'),
        }),
      );

      habit.restore(calendarDate('2026-10-08'));

      expect(lifecycleTransitions(habit)).toEqual([
        { action: HabitLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('keeps effectiveOn monotonic across consecutive changes in memory', () => {
      const habit = Habit.rehydrate(
        createProps({
          createdOn: calendarDate('2026-10-01'),
          latestLifecycleEffectiveOn: null,
        }),
      );

      habit.archive(calendarDate('2026-10-09'));
      habit.restore(calendarDate('2026-10-08'));

      expect(lifecycleTransitions(habit)).toEqual([
        { action: HabitLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
        { action: HabitLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('never moves effectiveOn before createdOn', () => {
      const habit = Habit.rehydrate(
        createProps({
          createdOn: calendarDate('2026-10-09'),
          latestLifecycleEffectiveOn: null,
        }),
      );

      habit.archive(calendarDate('2026-10-08'));

      expect(lifecycleTransitions(habit)).toEqual([
        { action: HabitLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('uses today when it is later than the latest recorded transition', () => {
      const habit = Habit.rehydrate(
        createProps({
          isActive: false,
          latestLifecycleEffectiveOn: calendarDate('2026-09-01'),
        }),
      );

      habit.restore(TODAY);

      expect(lifecycleTransitions(habit)).toEqual([
        { action: HabitLifecycleAction.RESTORED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('treats a newly created Habit as having a loaded, empty floor', () => {
      const habit = createHabit();

      habit.archive(TODAY);

      expect(lifecycleTransitions(habit)).toEqual([
        { action: HabitLifecycleAction.ARCHIVED, effectiveOn: '2026-10-09' },
      ]);
    });

    it('fails loudly on archive/restore when the floor was not loaded', () => {
      const active = Habit.rehydrate(
        createProps({ latestLifecycleEffectiveOn: undefined }),
      );
      const archived = Habit.rehydrate(
        createProps({ isActive: false, latestLifecycleEffectiveOn: undefined }),
      );

      expect(() => active.archive(TODAY)).toThrow(
        'Habit lifecycle floor was not loaded',
      );
      expect(() => archived.restore(TODAY)).toThrow(
        'Habit lifecycle floor was not loaded',
      );
      expect(active.isActive).toBe(true);
      expect(active.revision).toBe(1);
      expect(active.getDomainEvents()).toEqual([]);
    });

    it('does not record a transition for a regular update', () => {
      const habit = createHabit();

      habit.update({
        title: 'Evening walk',
        frequency: HabitFrequency.daily(),
        today: TODAY,
      });

      expect(lifecycleTransitions(habit)).toEqual([]);
    });
  });

  describe('schedule history', () => {
    it('closes the open version and starts a new one when the frequency changes', () => {
      const habit = Habit.rehydrate(createProps());

      habit.update({
        title: 'Morning walk',
        description: 'Walk slowly',
        frequency: HabitFrequency.daily(),
        today: TODAY,
      });

      const [event] = habit.getDomainEvents();
      expect(event).toBeInstanceOf(HabitScheduleVersionStartedEvent);
      expect(event).toMatchObject({ habitId: 'habit-id', ownerId: 'owner-id' });
      expect(scheduleVersions(habit)).toEqual([
        { frequency: 'DAILY:', effectiveFrom: '2026-10-09' },
      ]);
      expect(habit.revision).toBe(2);
    });

    it('records nothing when only the title or description changes', () => {
      const habit = Habit.rehydrate(createProps());

      habit.update({
        title: 'Evening walk',
        description: 'After work',
        frequency: HabitFrequency.weekly([5, 1]),
        today: TODAY,
      });

      expect(habit.revision).toBe(2);
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('records one version per change on the same day, leaving empty intervals', () => {
      // KD-FTH-006: phiên bản bị thay ngay trong ngày thành [D, D) rỗng —
      // không gộp, không xóa.
      const habit = Habit.rehydrate(createProps());

      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today: TODAY,
      });
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.weekly([2, 4]),
        today: TODAY,
      });

      expect(scheduleVersions(habit)).toEqual([
        { frequency: 'DAILY:', effectiveFrom: '2026-10-09' },
        { frequency: 'WEEKLY:2,4', effectiveFrom: '2026-10-09' },
      ]);
    });

    it('never starts a version before the open version when the time zone moved west', () => {
      // Owner đổi từ UTC+7 sang UTC-5: "hôm nay" mới sớm hơn effectiveFrom
      // của phiên bản đang mở — kẹp về mốc đó để không đóng phiên bản trước
      // ngày nó bắt đầu.
      const habit = Habit.rehydrate(
        createProps({ openScheduleEffectiveFrom: calendarDate('2026-10-09') }),
      );

      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today: calendarDate('2026-10-08'),
      });

      expect(scheduleVersions(habit)).toEqual([
        { frequency: 'DAILY:', effectiveFrom: '2026-10-09' },
      ]);
    });

    it('never starts a version before createdOn', () => {
      const habit = Habit.rehydrate(
        createProps({
          createdOn: calendarDate('2026-10-09'),
          openScheduleEffectiveFrom: null,
        }),
      );

      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today: calendarDate('2026-10-08'),
      });

      expect(scheduleVersions(habit)).toEqual([
        { frequency: 'DAILY:', effectiveFrom: '2026-10-09' },
      ]);
    });

    it('keeps effectiveFrom monotonic across consecutive changes in memory', () => {
      const habit = Habit.rehydrate(createProps());

      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.daily(),
        today: calendarDate('2026-10-09'),
      });
      habit.update({
        title: 'Morning walk',
        frequency: HabitFrequency.weekly([3]),
        today: calendarDate('2026-10-08'),
      });

      expect(scheduleVersions(habit)).toEqual([
        { frequency: 'DAILY:', effectiveFrom: '2026-10-09' },
        { frequency: 'WEEKLY:3', effectiveFrom: '2026-10-09' },
      ]);
    });

    it('fails loudly on a frequency change when the schedule floor was not loaded', () => {
      const habit = Habit.rehydrate(
        createProps({ openScheduleEffectiveFrom: undefined }),
      );

      expect(() =>
        habit.update({
          title: 'Evening walk',
          frequency: HabitFrequency.daily(),
          today: TODAY,
        }),
      ).toThrow('Habit schedule floor was not loaded');
      expect(habit.title).toBe('Morning walk');
      expect(habit.frequency?.days).toEqual([1, 5]);
      expect(habit.revision).toBe(1);
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('requires the owner calendar date only when the frequency changes', () => {
      const habit = Habit.rehydrate(createProps());

      expect(habit.changesFrequency(HabitFrequency.weekly([1, 5]))).toBe(false);
      expect(habit.changesFrequency(HabitFrequency.daily())).toBe(true);
      expect(habit.changesFrequency(null)).toBe(false);

      habit.update({
        title: 'Evening walk',
        frequency: HabitFrequency.weekly([1, 5]),
      });
      expect(habit.title).toBe('Evening walk');

      expect(() =>
        habit.update({
          title: 'Evening walk',
          frequency: HabitFrequency.daily(),
        }),
      ).toThrow('Owner calendar date is required to change a Habit frequency');
      expect(habit.frequency?.days).toEqual([1, 5]);
    });

    it('allows non-frequency edits when the schedule floor was not loaded', () => {
      const habit = Habit.rehydrate(
        createProps({ openScheduleEffectiveFrom: undefined }),
      );

      habit.update({
        title: 'Evening walk',
        frequency: HabitFrequency.weekly([1, 5]),
        today: TODAY,
      });

      expect(habit.title).toBe('Evening walk');
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('never records versions for QUIT Habits', () => {
      const habit = Habit.rehydrate(
        createProps({
          type: HabitType.QUIT,
          frequency: null,
          quitStartedAt: new Date('2026-08-01T00:00:00Z'),
          openScheduleEffectiveFrom: undefined,
        }),
      );

      habit.update({
        title: 'Quit smoking',
        quitStartedAt: new Date('2026-08-15T00:00:00Z'),
        today: TODAY,
      });

      expect(habit.revision).toBe(2);
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('does not touch schedule versions on archive or restore', () => {
      const habit = Habit.rehydrate(createProps());

      habit.archive(TODAY);
      habit.restore(TODAY);

      expect(scheduleVersions(habit)).toEqual([]);
    });
  });

  describe('schedule', () => {
    it('is due only on configured weekly days while active', () => {
      const habit = createHabit({
        frequency: HabitFrequency.weekly([1, 5]),
      });

      expect(habit.isDueOn(1)).toBe(true);
      expect(habit.isDueOn(2)).toBe(false);
    });

    it('is not due while archived', () => {
      const habit = createHabit();
      habit.archive(TODAY);

      expect(habit.isDueOn(1)).toBe(false);
    });

    it('is never due for QUIT-type Habits', () => {
      const habit = Habit.create({
        ownerId: 'owner-id',
        today: TODAY,
        title: 'Quit smoking',
        type: HabitType.QUIT,
      });

      expect(habit.isDueOn(1)).toBe(false);
    });
  });

  describe('rehydrate and primitives', () => {
    it('rehydrates without changing persisted state', () => {
      const props = createProps({ isActive: false, revision: 7 });

      const habit = Habit.rehydrate(props);

      expect(habit.id).toBe('habit-id');
      expect(habit.isActive).toBe(false);
      expect(habit.revision).toBe(7);
      expect(habit.getDomainEvents()).toEqual([]);
    });

    it('converts the aggregate into persistence primitives', () => {
      const habit = Habit.rehydrate(createProps());

      expect(habit.toPrimitives()).toEqual({
        id: 'habit-id',
        ownerId: 'owner-id',
        title: 'Morning walk',
        description: 'Walk slowly',
        type: 'BUILD',
        frequencyType: 'WEEKLY',
        frequencyDays: [1, 5],
        quitStartedAt: null,
        isActive: true,
        revision: 1,
        createdAt: new Date('2026-08-20T10:00:00Z'),
        createdOn: '2026-08-20',
        updatedAt: new Date('2026-08-20T10:00:00Z'),
      });
    });

    it('converts a QUIT aggregate into persistence primitives', () => {
      const habit = Habit.rehydrate(
        createProps({
          type: HabitType.QUIT,
          frequency: null,
          quitStartedAt: new Date('2026-08-01T00:00:00Z'),
        }),
      );

      expect(habit.toPrimitives()).toMatchObject({
        type: 'QUIT',
        frequencyType: null,
        frequencyDays: [],
        quitStartedAt: new Date('2026-08-01T00:00:00Z'),
      });
    });
  });
});

function createHabit(
  overrides: Partial<{
    title: string;
    description: string | null;
    frequency: HabitFrequency;
  }> = {},
): Habit {
  return Habit.create({
    ownerId: 'owner-id',
    today: TODAY,
    title: overrides.title ?? 'Morning walk',
    description: overrides.description,
    type: HabitType.BUILD,
    frequency: overrides.frequency ?? HabitFrequency.daily(),
  });
}

function createProps(overrides: Partial<HabitProps> = {}): HabitProps {
  return {
    id: new HabitId('habit-id'),
    ownerId: 'owner-id',
    title: 'Morning walk',
    description: 'Walk slowly',
    type: HabitType.BUILD,
    frequency: HabitFrequency.weekly([1, 5]),
    quitStartedAt: null,
    isActive: true,
    revision: 1,
    createdAt: new Date('2026-08-20T10:00:00Z'),
    createdOn: calendarDate('2026-08-20'),
    latestLifecycleEffectiveOn: null,
    openScheduleEffectiveFrom: calendarDate('2026-08-20'),
    updatedAt: new Date('2026-08-20T10:00:00Z'),
    ...overrides,
  };
}

function scheduleVersions(
  habit: Habit,
): { frequency: string; effectiveFrom: string }[] {
  return habit
    .getDomainEvents()
    .filter(
      (event): event is HabitScheduleVersionStartedEvent =>
        event instanceof HabitScheduleVersionStartedEvent,
    )
    .map((event) => ({
      frequency: `${event.frequency.type}:${event.frequency.days.join(',')}`,
      effectiveFrom: event.effectiveFrom.value,
    }));
}

function lifecycleTransitions(
  habit: Habit,
): { action: HabitLifecycleAction; effectiveOn: string }[] {
  return habit
    .getDomainEvents()
    .filter(
      (event): event is HabitLifecycleTransitionedEvent =>
        event instanceof HabitLifecycleTransitionedEvent,
    )
    .map((event) => ({
      action: event.action,
      effectiveOn: event.effectiveOn.value,
    }));
}
