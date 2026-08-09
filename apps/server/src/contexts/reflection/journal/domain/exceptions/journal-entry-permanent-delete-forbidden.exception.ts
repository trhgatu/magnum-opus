import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class JournalEntryPermanentDeleteForbiddenException extends DomainException {
  constructor(entryId: string) {
    super(
      'Journal entry ' +
        entryId +
        ' must be in trash before permanent deletion',
      Errors.JOURNAL_ENTRY_PERMANENT_DELETE_FORBIDDEN,
      { entryId },
    );
  }
}
