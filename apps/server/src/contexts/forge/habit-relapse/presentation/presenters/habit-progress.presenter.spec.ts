import { HabitProgressPresenter } from './habit-progress.presenter';

describe('HabitProgressPresenter', () => {
  it('returns the public API shape', () => {
    expect(
      HabitProgressPresenter.toResponse({
        habitId: 'habit-id',
        since: '2026-08-20',
        sinceReason: 'RELAPSE',
        daysSince: 7,
      }),
    ).toEqual({
      habitId: 'habit-id',
      since: '2026-08-20',
      sinceReason: 'RELAPSE',
      daysSince: 7,
    });
  });
});
