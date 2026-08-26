import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RoutineHabitReferenceNotFoundException extends DomainException {
  constructor(habitId: string) {
    super(
      `Habit "${habitId}" is unavailable for this Routine owner`,
      Errors.ROUTINE_HABIT_REFERENCE_NOT_FOUND,
      {
        habitId,
      },
    );
  }
}
