import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MoodJournalEntryNotFoundException extends DomainException {
  constructor(journalEntryId: string) {
    super(
      `Journal entry "${journalEntryId}" was not found`,
      Errors.JOURNAL_ENTRY_NOT_FOUND,
      { journalEntryId },
    );
  }
}
