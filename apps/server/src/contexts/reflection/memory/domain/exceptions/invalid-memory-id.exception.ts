import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMemoryIdException extends DomainException {
  constructor() {
    super('Memory ID cannot be empty', Errors.INVALID_MEMORY_ID);
  }
}
