import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitRelapseForbiddenException extends DomainException {
  constructor(habitId: string) {
    super(
      `Cannot log a relapse for Habit "${habitId}": not ACTIVE or not QUIT-type`,
      Errors.HABIT_RELAPSE_FORBIDDEN,
      { habitId },
    );
  }
}
