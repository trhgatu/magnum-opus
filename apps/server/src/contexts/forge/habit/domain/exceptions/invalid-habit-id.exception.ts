import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitIdException extends DomainException {
  constructor() {
    super('Habit ID must not be empty', Errors.INVALID_HABIT_ID);
  }
}
