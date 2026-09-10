import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitRelapsePresenter } from './habit-relapse.presenter';

describe('HabitRelapsePresenter', () => {
  it('returns the public API shape', () => {
    const relapse = HabitRelapse.create({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      occurredAt: new Date('2026-08-20T10:00:00.000Z'),
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
    });

    expect(HabitRelapsePresenter.toResponse(relapse)).toEqual({
      id: relapse.id,
      habitId: 'habit-id',
      occurredAt: '2026-08-20T10:00:00.000Z',
    });
  });
});
