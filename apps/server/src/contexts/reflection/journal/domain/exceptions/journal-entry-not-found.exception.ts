import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class JournalEntryNotFoundException extends DomainException {
  constructor(entryId: string) {
    super(
      `Journal entry with ID "${entryId}" was not found`,
      Errors.JOURNAL_ENTRY_NOT_FOUND,
      {
        entryId,
      },
    );
  }
}
