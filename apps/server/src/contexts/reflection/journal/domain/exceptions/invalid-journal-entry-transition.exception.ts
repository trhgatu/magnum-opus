import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

import { JournalEntryState } from '../enums';

export class InvalidJournalEntryTransitionException extends DomainException {
  constructor(from: JournalEntryState, to: JournalEntryState) {
    super(
      `Journal entry cannot transition from ${from} to ${to}`,
      Errors.INVALID_JOURNAL_ENTRY_TRANSITION,
      {
        from,
        to,
      },
    );
  }
}
