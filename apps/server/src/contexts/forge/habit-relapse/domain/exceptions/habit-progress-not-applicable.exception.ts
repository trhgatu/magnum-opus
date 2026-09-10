import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitProgressNotApplicableException extends DomainException {
  constructor(habitId: string) {
    super(
      `Habit "${habitId}" is not QUIT-type, it has no relapse progress`,
      Errors.HABIT_PROGRESS_NOT_APPLICABLE,
      { habitId },
    );
  }
}
