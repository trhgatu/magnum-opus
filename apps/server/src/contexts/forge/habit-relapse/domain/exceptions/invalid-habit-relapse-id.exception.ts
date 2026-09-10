import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitRelapseIdException extends DomainException {
  constructor() {
    super(
      'Habit relapse ID must be a valid UUID',
      Errors.INVALID_HABIT_RELAPSE_ID,
    );
  }
}
