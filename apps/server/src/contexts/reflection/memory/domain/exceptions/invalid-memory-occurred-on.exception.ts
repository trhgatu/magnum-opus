import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMemoryOccurredOnException extends DomainException {
  constructor() {
    super(
      'Memory occurrence date and precision are inconsistent',
      Errors.INVALID_MEMORY_OCCURRED_ON,
    );
  }
}
