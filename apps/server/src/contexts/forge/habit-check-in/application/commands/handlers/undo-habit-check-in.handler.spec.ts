import { HabitCheckInUndoneEvent } from '../../../domain/events';
import { HabitCheckIn } from '../../../domain/habit-check-in.aggregate';
import { HabitCheckInRepository } from '../../../domain/ports/habit-check-in.repository';
import {
  HabitCheckInDate,
  HabitCheckInId,
} from '../../../domain/value-objects';
import { HabitCheckInContextService } from '../../services';
import { UndoHabitCheckInCommand } from '../undo-habit-check-in.command';
import { UndoHabitCheckInHandler } from './undo-habit-check-in.handler';

describe('UndoHabitCheckInHandler', () => {
  const now = new Date('2026-08-24T18:30:00.000Z');
  const context = {
    currentDateForOwnedHabit: jest.fn(),
  } as unknown as jest.Mocked<HabitCheckInContextService>;
  const repository = {
    findByHabitAndDateForOwner: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<HabitCheckInRepository>;
  const handler = new UndoHabitCheckInHandler(repository, context);

  beforeEach(() => {
    jest.clearAllMocks();
    context.currentDateForOwnedHabit.mockResolvedValue({
      date: HabitCheckInDate.create('2026-08-25'),
      now,
    });
    repository.delete.mockResolvedValue(true);
  });

  it("undoes the owner's check-in for today without requiring an active Habit", async () => {
    const checkIn = existingCheckIn();
    repository.findByHabitAndDateForOwner.mockResolvedValue(checkIn);

    const result = await handler.execute(
      new UndoHabitCheckInCommand('habit-id', 'owner-id'),
    );

    expect(context.currentDateForOwnedHabit).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
      false,
    );
    expect(repository.findByHabitAndDateForOwner).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
      '2026-08-25',
    );
    expect(repository.delete).toHaveBeenCalledWith(checkIn);
    expect(checkIn.getDomainEvents()).toEqual([
      expect.any(HabitCheckInUndoneEvent),
    ]);
    expect(result.unwrap()).toBeUndefined();
  });

  it('succeeds without deleting when there is no check-in today', async () => {
    repository.findByHabitAndDateForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new UndoHabitCheckInCommand('habit-id', 'owner-id'),
    );

    expect(repository.delete).not.toHaveBeenCalled();
    expect(result.unwrap()).toBeUndefined();
  });
});

function existingCheckIn(): HabitCheckIn {
  return HabitCheckIn.rehydrate({
    id: HabitCheckInId.create('72b45d9d-7ac6-4ec8-b3bc-5d67134b9676'),
    habitId: 'habit-id',
    ownerId: 'owner-id',
    date: HabitCheckInDate.create('2026-08-25'),
    createdAt: new Date('2026-08-25T01:00:00.000Z'),
  });
}
