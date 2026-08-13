import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MemoryRevisionConflictException extends DomainException {
  constructor(memoryId: string, expectedRevision: number) {
    super(
      `Memory "${memoryId}" changed after revision ${expectedRevision}`,
      Errors.MEMORY_REVISION_CONFLICT,
      { memoryId, expectedRevision },
    );
  }
}
