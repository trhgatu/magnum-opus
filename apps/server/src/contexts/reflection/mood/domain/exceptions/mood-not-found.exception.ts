import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MoodNotFoundException extends DomainException {
  constructor(journalEntryId: string) {
    super(
      `Mood for Journal entry "${journalEntryId}" was not found`,
      Errors.MOOD_NOT_FOUND,
      {
        journalEntryId,
      },
    );
  }
}
