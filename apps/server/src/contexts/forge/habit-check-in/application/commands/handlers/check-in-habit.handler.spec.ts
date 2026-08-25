import { HabitCheckIn } from '../../../domain/habit-check-in.aggregate';
import { HabitCheckInRepository } from '../../../domain/ports/habit-check-in.repository';
import { HabitCheckInDate } from '../../../domain/value-objects';
import { HabitCheckInContextService } from '../../services';
import { CheckInHabitCommand } from '../check-in-habit.command';
import { CheckInHabitHandler } from './check-in-habit.handler';

describe('CheckInHabitHandler', () => {
  it('uses the owner-timezone date supplied by the context service', async () => {
    const now = new Date('2026-08-24T18:30:00.000Z');
    const context = {
      currentDateForOwnedHabit: jest.fn().mockResolvedValue({
        date: HabitCheckInDate.create('2026-08-25'),
        now,
      }),
    } as unknown as HabitCheckInContextService;
    const repository = {
      createIfAbsent: jest
        .fn()
        .mockImplementation(async (checkIn: HabitCheckIn) => checkIn),
    } as unknown as HabitCheckInRepository;
    const handler = new CheckInHabitHandler(repository, context);

    const result = await handler.execute(
      new CheckInHabitCommand('habit-id', 'owner-id'),
    );

    expect(context.currentDateForOwnedHabit).toHaveBeenCalledWith(
      'habit-id',
      'owner-id',
      true,
    );
    expect(result.unwrap().toPrimitives()).toMatchObject({
      habitId: 'habit-id',
      ownerId: 'owner-id',
      date: '2026-08-25',
      createdAt: now,
    });
  });
});
