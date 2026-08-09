import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '../../../domain/ports/journal-entry.repository';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { GetJournalEntriesQuery } from '../get-journal-entries.query';

export interface GetJournalEntriesResult {
  entries: JournalEntry[];
  total: number;
}

@QueryHandler(GetJournalEntriesQuery)
export class GetJournalEntriesHandler implements IQueryHandler<
  GetJournalEntriesQuery,
  Result<GetJournalEntriesResult, DomainException>
> {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
  ) {}

  public async execute(
    query: GetJournalEntriesQuery,
  ): Promise<Result<GetJournalEntriesResult, DomainException>> {
    const skip = (query.page - 1) * query.limit;

    const result = await this.journalEntryRepository.findAllForOwner(
      query.ownerId,
      {
        skip,
        take: query.limit,
        state: query.state,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );

    return Result.ok(result);
  }
}
