import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRoutineTransitionException extends DomainException {
  constructor(isActive: boolean) {
    super(
      `Routine is already ${isActive ? 'active' : 'archived'}`,
      Errors.INVALID_ROUTINE_TRANSITION,
      { isActive },
    );
  }
}
