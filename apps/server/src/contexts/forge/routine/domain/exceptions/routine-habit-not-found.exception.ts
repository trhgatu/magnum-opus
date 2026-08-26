import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RoutineHabitNotFoundException extends DomainException {
  constructor(habitId: string) {
    super(
      `Habit "${habitId}" does not belong to this Routine`,
      Errors.ROUTINE_HABIT_NOT_FOUND,
      {
        habitId,
      },
    );
  }
}
