import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MoodJournalEntryNotEditableException extends DomainException {
  constructor(journalEntryId: string, state: string) {
    super(
      `Mood cannot be changed because Journal entry "${journalEntryId}" is ${state}`,
      Errors.MOOD_JOURNAL_ENTRY_NOT_EDITABLE,
      {
        journalEntryId,
        state,
      },
    );
  }
}
