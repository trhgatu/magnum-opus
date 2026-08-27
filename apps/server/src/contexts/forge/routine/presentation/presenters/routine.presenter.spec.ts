import { Routine } from '../../domain/routine.aggregate';
import { RoutineId } from '../../domain/value-objects';
import { RoutinePresenter } from './routine.presenter';
import { RoutineDetailReadModel } from '../../application/ports/routine-reader.port';

describe('RoutinePresenter', () => {
  it('maps the aggregate to the public response without owner identity', () => {
    const routine = Routine.rehydrate({
      id: new RoutineId('routine-id'),
      ownerId: 'owner-id',
      title: 'Morning ritual',
      habitIds: ['habit-first', 'habit-second'],
      isActive: true,
      revision: 4,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
    });

    const response = RoutinePresenter.toResponse(routine);

    expect(response).toEqual({
      id: 'routine-id',
      title: 'Morning ritual',
      habitIds: ['habit-first', 'habit-second'],
      isActive: true,
      revision: 4,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-21T10:00:00.000Z',
    });

    expect(response).not.toHaveProperty('ownerId');
  });
  it('maps the detail read model with ordered Habit summaries', () => {
    const detail: RoutineDetailReadModel = {
      id: 'routine-id',
      title: 'Morning ritual',
      isActive: true,
      revision: 4,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-21T10:00:00.000Z'),
      habits: [
        {
          id: 'habit-first',
          title: 'Drink water',
          isActive: true,
          order: 1,
        },
        {
          id: 'habit-second',
          title: 'Read',
          isActive: false,
          order: 2,
        },
      ],
    };

    expect(RoutinePresenter.toDetailResponse(detail)).toEqual({
      id: 'routine-id',
      title: 'Morning ritual',
      isActive: true,
      revision: 4,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-21T10:00:00.000Z',
      habits: [
        {
          id: 'habit-first',
          title: 'Drink water',
          isActive: true,
          order: 1,
        },
        {
          id: 'habit-second',
          title: 'Read',
          isActive: false,
          order: 2,
        },
      ],
    });
  });
});
