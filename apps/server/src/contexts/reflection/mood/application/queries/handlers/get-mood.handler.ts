import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Mood } from '../../../domain/mood.aggregate';
import { MoodJournalEntryNotFoundException } from '../../../domain/exceptions';
import {
  MOOD_REPOSITORY,
  type MoodRepository,
} from '../../../domain/ports/mood.repository';
import { GetMoodQuery } from '../get-mood.query';
import {
  MOOD_JOURNAL_ENTRY_READER,
  type MoodJournalEntryReader,
  MoodJournalEntryAccessStatus,
} from '../../ports/mood-journal-entry-reader.port';

@QueryHandler(GetMoodQuery)
export class GetMoodHandler implements IQueryHandler<
  GetMoodQuery,
  Result<Mood | null, DomainException>
> {
  constructor(
    @Inject(MOOD_JOURNAL_ENTRY_READER)
    private readonly journalEntryReader: MoodJournalEntryReader,
    @Inject(MOOD_REPOSITORY)
    private readonly moodRepository: MoodRepository,
  ) {}

  public async execute(
    query: GetMoodQuery,
  ): Promise<Result<Mood | null, DomainException>> {
    const access = await this.journalEntryReader.getAccessForOwner(
      query.journalEntryId,
      query.ownerId,
    );

    if (access.status === MoodJournalEntryAccessStatus.NOT_FOUND) {
      return Result.fail(
        new MoodJournalEntryNotFoundException(query.journalEntryId),
      );
    }

    const mood = await this.moodRepository.findByJournalEntryIdForOwner(
      query.journalEntryId,
      query.ownerId,
    );

    return Result.ok(mood);
  }
}
