import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRoutineHabitIdException extends DomainException {
  constructor() {
    super(
      'Routine Habit ID must not be empty',
      Errors.INVALID_ROUTINE_HABIT_ID,
    );
  }
}
