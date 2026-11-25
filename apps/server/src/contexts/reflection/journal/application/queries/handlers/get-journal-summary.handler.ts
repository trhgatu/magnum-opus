import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  JOURNAL_LIST_READER,
  type JournalListReader,
} from '../../ports/journal-list-reader.port';
import { GetJournalSummaryQuery } from '../get-journal-summary.query';

@QueryHandler(GetJournalSummaryQuery)
export class GetJournalSummaryHandler implements IQueryHandler<
  GetJournalSummaryQuery,
  { writtenDaysLast7: number }
> {
  constructor(
    @Inject(JOURNAL_LIST_READER)
    private readonly listReader: JournalListReader,
  ) {}

  async execute(query: GetJournalSummaryQuery) {
    return {
      writtenDaysLast7: await this.listReader.writtenDaysLast7(
        query.ownerId,
        query.now,
      ),
    };
  }
}
