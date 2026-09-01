import type { TodayReadModel } from '../../application/ports/today-reader.port';
import { TodayPresenter } from './today.presenter';

describe('TodayPresenter', () => {
  it('maps the Today read model to the public response', () => {
    const today: TodayReadModel = {
      date: '2026-08-31',
      timeZone: 'Asia/Bangkok',
      emptyReason: null,
      routines: [
        {
          id: 'routine-id',
          title: 'Morning ritual',
          habits: [
            {
              id: 'habit-id',
              title: 'Drink water',
              description: 'One glass',
              checkedIn: true,
            },
          ],
        },
      ],
      standaloneHabits: [
        {
          id: 'standalone-habit-id',
          title: 'Journal',
          description: null,
          checkedIn: false,
        },
      ],
    };

    const response = TodayPresenter.toResponse(today);

    expect(response).toEqual({
      date: '2026-08-31',
      timeZone: 'Asia/Bangkok',
      emptyReason: null,
      routines: [
        {
          id: 'routine-id',
          title: 'Morning ritual',
          habits: [
            {
              id: 'habit-id',
              title: 'Drink water',
              description: 'One glass',
              checkedIn: true,
            },
          ],
        },
      ],
      standaloneHabits: [
        {
          id: 'standalone-habit-id',
          title: 'Journal',
          description: null,
          checkedIn: false,
        },
      ],
    });

    expect(response).not.toHaveProperty('ownerId');
  });
});
