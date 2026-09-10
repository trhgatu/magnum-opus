import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitTypeException extends DomainException {
  constructor() {
    super(
      'Habit fields do not match its type: BUILD requires frequency and forbids quitStartedAt, QUIT requires quitStartedAt and forbids frequency',
      Errors.INVALID_HABIT_TYPE,
    );
  }
}
