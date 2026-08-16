import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidJournalEntryTitleException extends DomainException {
  constructor() {
    super(
      'Journal entry title must contain at most 200 characters',
      Errors.INVALID_JOURNAL_ENTRY_TITLE,
    );
  }
}
