import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '../../../domain/ports/journal-entry.repository';

import {
  JOURNAL_LIST_READER,
  type JournalEntryExtras,
  type JournalListReader,
} from '../../ports/journal-list-reader.port';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { GetJournalEntriesQuery } from '../get-journal-entries.query';

export interface GetJournalEntriesResult {
  entries: JournalEntry[];
  total: number;
  extras: Map<string, JournalEntryExtras>;
}

@QueryHandler(GetJournalEntriesQuery)
export class GetJournalEntriesHandler implements IQueryHandler<
  GetJournalEntriesQuery,
  Result<GetJournalEntriesResult, DomainException>
> {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
    @Inject(JOURNAL_LIST_READER)
    private readonly listReader: JournalListReader,
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

    const extras = await this.listReader.extrasFor(
      query.ownerId,
      result.entries.map((entry) => entry.id),
    );
    return Result.ok({ ...result, extras });
  }
}
