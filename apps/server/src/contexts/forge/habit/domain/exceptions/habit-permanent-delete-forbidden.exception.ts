import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitPermanentDeleteForbiddenException extends DomainException {
  constructor(habitId: string) {
    super(
      `Habit "${habitId}" must be in Trash before permanent deletion`,
      Errors.HABIT_PERMANENT_DELETE_FORBIDDEN,
      { habitId },
    );
  }
}
