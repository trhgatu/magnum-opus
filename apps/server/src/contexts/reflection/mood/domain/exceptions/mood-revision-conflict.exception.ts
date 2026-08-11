import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class MoodRevisionConflictException extends DomainException {
  constructor(journalEntryId: string, expectedRevision: number | null) {
    super(
      `Mood for Journal entry "${journalEntryId}" has changed since revision ${expectedRevision ?? 'none'}`,
      Errors.MOOD_REVISION_CONFLICT,
      {
        journalEntryId,
        expectedRevision,
      },
    );
  }
}
