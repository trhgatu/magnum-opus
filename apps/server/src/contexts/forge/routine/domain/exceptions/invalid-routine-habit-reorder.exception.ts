import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRoutineHabitReorderException extends DomainException {
  constructor() {
    super(
      'Reordered Habit IDs must be exactly the Routine current Habits, each listed once',
      Errors.INVALID_ROUTINE_HABIT_REORDER,
    );
  }
}
