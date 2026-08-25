import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidHabitTransitionException extends DomainException {
  constructor(isActive: boolean) {
    super(
      `Habit is already ${isActive ? 'active' : 'archived'}`,
      Errors.INVALID_HABIT_TRANSITION,
      { isActive },
    );
  }
}
