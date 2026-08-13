import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMemorySourceJournalException extends DomainException {
  constructor(journalEntryId: string) {
    super(
      'A trashed Journal entry cannot be used as a Memory source',
      Errors.INVALID_MEMORY_SOURCE_JOURNAL,
      {
        journalEntryId,
      },
    );
  }
}
