import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRoutineIdException extends DomainException {
  constructor() {
    super('Routine ID must not be empty', Errors.INVALID_ROUTINE_ID);
  }
}
