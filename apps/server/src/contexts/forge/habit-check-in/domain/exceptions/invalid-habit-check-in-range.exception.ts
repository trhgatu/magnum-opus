import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitCheckInRangeException extends DomainException {
  constructor(from: string, to: string) {
    super(
      'Habit check-in history range is invalid or exceeds 366 days',
      Errors.INVALID_HABIT_CHECK_IN_RANGE,
      { from, to, maximumDays: 366 },
    );
  }
}
