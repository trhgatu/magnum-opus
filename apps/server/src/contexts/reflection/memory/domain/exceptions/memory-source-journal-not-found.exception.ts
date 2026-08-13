import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MemorySourceJournalNotFoundException extends DomainException {
  constructor(journalEntryId: string) {
    super(
      'The Journal source was not found',
      Errors.MEMORY_SOURCE_JOURNAL_NOT_FOUND,
      { journalEntryId },
    );
  }
}
