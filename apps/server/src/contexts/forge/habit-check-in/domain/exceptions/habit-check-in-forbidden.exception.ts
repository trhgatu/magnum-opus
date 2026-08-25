import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitCheckInForbiddenException extends DomainException {
  constructor(habitId: string) {
    super(
      `Archived Habit "${habitId}" cannot be checked in`,
      Errors.HABIT_CHECK_IN_FORBIDDEN,
      { habitId },
    );
  }
}
