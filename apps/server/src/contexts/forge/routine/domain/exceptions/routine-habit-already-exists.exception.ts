import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RoutineHabitAlreadyExistsException extends DomainException {
  constructor(habitId: string) {
    super(
      `Habit "${habitId}" already belongs to this Routine`,
      Errors.ROUTINE_HABIT_ALREADY_EXISTS,
      {
        habitId,
      },
    );
  }
}
