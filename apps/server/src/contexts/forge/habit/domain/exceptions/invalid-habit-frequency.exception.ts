import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitFrequencyException extends DomainException {
  constructor() {
    super(
      'Habit frequency must use DAILY with no weekdays or WEEKLY with canonical ISO weekdays from 1 to 7',
      Errors.INVALID_HABIT_FREQUENCY,
    );
  }
}
