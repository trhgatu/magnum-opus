import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidIntendedOutcomeException extends DomainException {
  constructor() {
    super(
      'Intended outcome must not be empty when provided',
      Errors.INVALID_INTENDED_OUTCOME,
    );
  }
}
