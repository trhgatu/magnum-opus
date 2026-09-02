import { HabitCheckInRepository } from '../../../domain/ports/habit-check-in.repository';
import { HabitCheckInDate } from '../../../domain/value-objects';
import { HabitCheckInContextService } from '../../services';
import { UndoHabitCheckInCommand } from '../undo-habit-check-in.command';
import { UndoHabitCheckInHandler } from './undo-habit-check-in.handler';

describe('UndoHabitCheckInHandler', () => {
  it('deletes the check-in for the owner-timezone date without requiring an active Habit', async () => {
    const now = new Date('2026-08-24T18:30:00.000Z');
    const context = {
      currentDateForOwnedHabit: jest.fn().mockResolvedValue({
        date: HabitCheckInDate.create('2026-08-25'),
        now,
      }),
    } as unknown as HabitCheckInContextService;
    const repository = {
      deleteByHabitAndDateForOwner: jest.fn().mockResolvedValue(true),
    } as unknown as HabitCheckInRepository;
    const handler = new UndoHabitCheckInHandler(repository, context);

    const result = await handler.execute(
      new UndoHabitCheckInCommand('habit-id', 'owner-id'),
    );

    expect(context.currentDateForOwnedHabit).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
      false,
    );
    expect(repository.deleteByHabitAndDateForOwner).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
      '2026-08-25',
    );
    expect(result.unwrap()).toBeUndefined();
  });
});
