import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidProjectCycleIdException extends DomainException {
  constructor() {
    super(
      'Project Cycle ID must not be empty',
      Errors.INVALID_PROJECT_CYCLE_ID,
    );
  }
}
