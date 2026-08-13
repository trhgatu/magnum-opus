import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMemoryTitleException extends DomainException {
  constructor() {
    super(
      'Memory title must contain between 1 and 200 characters',
      Errors.INVALID_MEMORY_TITLE,
    );
  }
}
