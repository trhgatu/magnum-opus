import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidJournalEntryIdException extends DomainException {
  constructor() {
    super('Journal entry ID cannot be empty', Errors.INVALID_JOURNAL_ENTRY_ID);
  }
}
