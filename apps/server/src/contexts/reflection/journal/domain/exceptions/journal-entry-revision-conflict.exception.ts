import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class JournalEntryRevisionConflictException extends DomainException {
  constructor(entryId: string, expectedRevision: number) {
    super(
      `Journal entry "${entryId}" has changed since revision ${expectedRevision}`,
      Errors.JOURNAL_ENTRY_REVISION_CONFLICT,
      {
        entryId,
        expectedRevision,
      },
    );
  }
}
