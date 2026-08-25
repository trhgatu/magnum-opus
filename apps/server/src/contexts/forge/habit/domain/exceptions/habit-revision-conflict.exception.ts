import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class HabitRevisionConflictException extends DomainException {
  constructor(habitId: string, expectedRevision: number) {
    super(
      `Habit "${habitId}" changed after revision ${expectedRevision}`,
      Errors.HABIT_REVISION_CONFLICT,
      { habitId, expectedRevision },
    );
  }
}
