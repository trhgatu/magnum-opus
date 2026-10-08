import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRoutineHabitReorderException extends DomainException {
  constructor() {
    super(
      'The reordered list must include every current Routine Habit ID exactly once',
      Errors.INVALID_ROUTINE_HABIT_REORDER,
    );
  }
}
