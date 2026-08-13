import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMemoryContentException extends DomainException {
  constructor() {
    super('Memory content cannot be empty', Errors.INVALID_MEMORY_CONTENT);
  }
}
