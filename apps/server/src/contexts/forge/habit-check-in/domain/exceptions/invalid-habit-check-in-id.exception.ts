import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitCheckInIdException extends DomainException {
  constructor() {
    super(
      'Habit check-in ID must be a valid UUID',
      Errors.INVALID_HABIT_CHECK_IN_ID,
    );
  }
}
