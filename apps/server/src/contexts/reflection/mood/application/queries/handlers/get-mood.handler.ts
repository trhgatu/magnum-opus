import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { JournalEntryNotFoundException } from '@/contexts/reflection/journal/domain/exceptions';
import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '@/contexts/reflection/journal/domain/ports/journal-entry.repository';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Mood } from '../../../domain/mood.aggregate';
import {
  MOOD_REPOSITORY,
  type MoodRepository,
} from '../../../domain/ports/mood.repository';
import { GetMoodQuery } from '../get-mood.query';

@QueryHandler(GetMoodQuery)
export class GetMoodHandler implements IQueryHandler<
  GetMoodQuery,
  Result<Mood | null, DomainException>
> {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
    @Inject(MOOD_REPOSITORY)
    private readonly moodRepository: MoodRepository,
  ) {}

  public async execute(
    query: GetMoodQuery,
  ): Promise<Result<Mood | null, DomainException>> {
    const entry = await this.journalEntryRepository.findByIdForOwner(
      query.journalEntryId,
      query.ownerId,
    );

    if (!entry) {
      return Result.fail(
        new JournalEntryNotFoundException(query.journalEntryId),
      );
    }

    const mood = await this.moodRepository.findByJournalEntryIdForOwner(
      query.journalEntryId,
      query.ownerId,
    );

    return Result.ok(mood);
  }
}
