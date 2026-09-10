import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitTypeNotAllowedInRoutineException extends DomainException {
  constructor(habitId: string) {
    super(
      `QUIT-type Habit "${habitId}" cannot be added to a Routine`,
      Errors.HABIT_TYPE_NOT_ALLOWED_IN_ROUTINE,
      {
        habitId,
      },
    );
  }
}
