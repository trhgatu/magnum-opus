import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { JournalEntryNotFoundException } from '../../../domain/exceptions';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '../../../domain/ports/journal-entry.repository';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { GetJournalEntryQuery } from '../get-journal-entry.query';

@QueryHandler(GetJournalEntryQuery)
export class GetJournalEntryHandler implements IQueryHandler<
  GetJournalEntryQuery,
  Result<JournalEntry, DomainException>
> {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
  ) {}

  public async execute(
    query: GetJournalEntryQuery,
  ): Promise<Result<JournalEntry, DomainException>> {
    const entry = await this.journalEntryRepository.findByIdForOwner(
      query.entryId,
      query.ownerId,
    );

    if (!entry) {
      return Result.fail(new JournalEntryNotFoundException(query.entryId));
    }

    return Result.ok(entry);
  }
}
