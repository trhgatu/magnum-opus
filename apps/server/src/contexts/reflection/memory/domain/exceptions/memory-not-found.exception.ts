import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MemoryNotFoundException extends DomainException {
  constructor(memoryId: string) {
    super(
      `Memory with ID "${memoryId}" was not found`,
      Errors.MEMORY_NOT_FOUND,
      {
        memoryId,
      },
    );
  }
}
