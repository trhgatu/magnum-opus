import { HabitFrequencyType, HabitType } from '../../domain/enums';
import { Habit } from '../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../domain/value-objects';
import { HabitPresenter } from './habit.presenter';

describe('HabitPresenter', () => {
  it('returns the public API shape without owner internals', () => {
    const habit = Habit.rehydrate({
      id: new HabitId('habit-id'),
      ownerId: 'owner-id',
      title: 'Morning walk',
      description: null,
      type: HabitType.BUILD,
      frequency: HabitFrequency.weekly([1, 5]),
      quitStartedAt: null,
      isActive: true,
      revision: 3,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
    });

    expect(HabitPresenter.toResponse(habit)).toEqual({
      id: 'habit-id',
      title: 'Morning walk',
      description: null,
      type: HabitType.BUILD,
      frequencyType: HabitFrequencyType.WEEKLY,
      frequencyDays: [1, 5],
      quitStartedAt: null,
      isActive: true,
      revision: 3,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-21T10:00:00.000Z',
    });
  });

  it('formats a QUIT Habit response', () => {
    const habit = Habit.rehydrate({
      id: new HabitId('habit-id'),
      ownerId: 'owner-id',
      title: 'Quit smoking',
      description: null,
      type: HabitType.QUIT,
      frequency: null,
      quitStartedAt: new Date('2026-08-01T00:00:00.000Z'),
      isActive: true,
      revision: 1,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-20T10:00:00.000Z'),
    });

    expect(HabitPresenter.toResponse(habit)).toMatchObject({
      type: HabitType.QUIT,
      frequencyType: null,
      frequencyDays: [],
      quitStartedAt: '2026-08-01',
    });
  });
});
