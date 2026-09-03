import type { HabitCheckInReadModel } from '../../application/ports/habit-check-in-reader.port';
import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { HabitCheckInDate } from '../../domain/value-objects';
import { HabitCheckInPresenter } from './habit-check-in.presenter';

describe('HabitCheckInPresenter', () => {
  describe('toResponse', () => {
    it('maps the aggregate to the public response, serializing the timestamp', () => {
      const checkIn = HabitCheckIn.create({
        habitId: 'habit-id',
        ownerId: 'owner-id',
        date: HabitCheckInDate.create('2026-08-24'),
        createdAt: new Date('2026-08-24T09:15:00.000Z'),
      });

      const response = HabitCheckInPresenter.toResponse(checkIn);

      expect(response).toEqual({
        id: checkIn.id,
        habitId: 'habit-id',
        date: '2026-08-24',
        createdAt: '2026-08-24T09:15:00.000Z',
      });
      expect(response).not.toHaveProperty('ownerId');
    });
  });

  describe('toTodayResponse', () => {
    it('reports checkedIn true and includes the check-in when one exists', () => {
      const readModel: HabitCheckInReadModel = {
        id: 'check-in-id',
        habitId: 'habit-id',
        date: '2026-08-24',
        createdAt: new Date('2026-08-24T09:15:00.000Z'),
      };

      const response = HabitCheckInPresenter.toTodayResponse(
        '2026-08-24',
        readModel,
      );

      expect(response).toEqual({
        date: '2026-08-24',
        checkedIn: true,
        checkIn: {
          id: 'check-in-id',
          habitId: 'habit-id',
          date: '2026-08-24',
          createdAt: '2026-08-24T09:15:00.000Z',
        },
      });
    });

    it('reports checkedIn false with a null check-in when none exists', () => {
      const response = HabitCheckInPresenter.toTodayResponse(
        '2026-08-24',
        null,
      );

      expect(response).toEqual({
        date: '2026-08-24',
        checkedIn: false,
        checkIn: null,
      });
    });
  });

  describe('toHistoryResponse', () => {
    it('maps a list of check-ins to their calendar dates within the requested range', () => {
      const response = HabitCheckInPresenter.toHistoryResponse(
        'habit-id',
        '2026-08-01',
        '2026-08-31',
        [
          {
            id: 'check-in-1',
            habitId: 'habit-id',
            date: '2026-08-05',
            createdAt: new Date('2026-08-05T09:00:00.000Z'),
          },
          {
            id: 'check-in-2',
            habitId: 'habit-id',
            date: '2026-08-24',
            createdAt: new Date('2026-08-24T09:15:00.000Z'),
          },
        ],
      );

      expect(response).toEqual({
        habitId: 'habit-id',
        from: '2026-08-01',
        to: '2026-08-31',
        dates: ['2026-08-05', '2026-08-24'],
      });
    });

    it('returns an empty date list when no check-ins fall in range', () => {
      const response = HabitCheckInPresenter.toHistoryResponse(
        'habit-id',
        '2026-08-01',
        '2026-08-31',
        [],
      );

      expect(response.dates).toEqual([]);
    });
  });
});
