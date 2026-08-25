import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitTitleException extends DomainException {
  constructor() {
    super(
      'Habit title must contain between 1 and 200 characters',
      Errors.INVALID_HABIT_TITLE,
    );
  }
}
