import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitCheckInForbiddenException extends DomainException {
  constructor(habitId: string) {
    super(
      `Cannot check in Habit "${habitId}": not ACTIVE or not BUILD-type`,
      Errors.HABIT_CHECK_IN_FORBIDDEN,
      { habitId },
    );
  }
}
