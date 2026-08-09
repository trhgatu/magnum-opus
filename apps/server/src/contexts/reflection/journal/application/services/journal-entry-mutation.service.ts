import { Inject, Injectable } from '@nestjs/common';

import {
  JournalEntryNotFoundException,
  JournalEntryRevisionConflictException,
} from '../../domain/exceptions';
import { JournalEntry } from '../../domain/journal-entry.aggregate';
import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '../../domain/ports/journal-entry.repository';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

export interface JournalEntryMutationInput {
  entryId: string;
  ownerId: string;
  expectedRevision: number;
  mutate: (entry: JournalEntry) => void;
}

@Injectable()
export class JournalEntryMutationService {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
  ) {}

  public async mutate(
    input: JournalEntryMutationInput,
  ): Promise<Result<JournalEntry, DomainException>> {
    const entry = await this.journalEntryRepository.findByIdForOwner(
      input.entryId,
      input.ownerId,
    );

    if (!entry) {
      return Result.fail(new JournalEntryNotFoundException(input.entryId));
    }

    if (entry.revision !== input.expectedRevision) {
      return Result.fail(
        new JournalEntryRevisionConflictException(
          input.entryId,
          input.expectedRevision,
        ),
      );
    }

    try {
      input.mutate(entry);
    } catch (error: unknown) {
      if (error instanceof DomainException) {
        return Result.fail(error);
      }

      throw error;
    }

    if (entry.revision === input.expectedRevision) {
      return Result.ok(entry);
    }

    const updated = await this.journalEntryRepository.update(
      entry,
      input.expectedRevision,
    );

    if (!updated) {
      return Result.fail(
        new JournalEntryRevisionConflictException(
          input.entryId,
          input.expectedRevision,
        ),
      );
    }

    return Result.ok(entry);
  }
}
