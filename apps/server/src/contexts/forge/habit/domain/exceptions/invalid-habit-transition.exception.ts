import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { HabitState } from '../enums';

export class InvalidHabitTransitionException extends DomainException {
  constructor(state: HabitState) {
    super(`Habit is ${state.toLowerCase()}`, Errors.INVALID_HABIT_TRANSITION, {
      state,
    });
  }
}
