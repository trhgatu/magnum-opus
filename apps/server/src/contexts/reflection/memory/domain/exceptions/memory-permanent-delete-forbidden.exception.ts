import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MemoryPermanentDeleteForbiddenException extends DomainException {
  constructor(memoryId: string) {
    super(
      `Memory "${memoryId}" must be in Trash before permanent deletion`,
      Errors.MEMORY_PERMANENT_DELETE_FORBIDDEN,
      { memoryId },
    );
  }
}
