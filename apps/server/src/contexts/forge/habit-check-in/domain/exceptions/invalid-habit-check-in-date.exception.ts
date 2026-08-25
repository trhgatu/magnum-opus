import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitCheckInDateException extends DomainException {
  constructor(date: string) {
    super(
      `Habit check-in date "${date}" is not a valid calendar date`,
      Errors.INVALID_HABIT_CHECK_IN_DATE,
      { date },
    );
  }
}
