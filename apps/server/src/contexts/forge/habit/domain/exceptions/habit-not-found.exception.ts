import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitNotFoundException extends DomainException {
  constructor(habitId: string) {
    super(`Habit with ID "${habitId}" was not found`, Errors.HABIT_NOT_FOUND, {
      habitId,
    });
  }
}
