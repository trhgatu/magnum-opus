import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RoutineHabitInactiveException extends DomainException {
  constructor(habitId: string) {
    super(
      `Inactive Habit "${habitId}" cannot be added to a Routine`,
      Errors.ROUTINE_HABIT_INACTIVE,
      {
        habitId,
      },
    );
  }
}
