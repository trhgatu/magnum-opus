import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { JournalEntryState } from '@/contexts/reflection/journal/domain/enums';
import { JournalEntryNotFoundException } from '@/contexts/reflection/journal/domain/exceptions';
import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '@/contexts/reflection/journal/domain/ports/journal-entry.repository';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  MoodJournalEntryNotEditableException,
  MoodNotFoundException,
  MoodRevisionConflictException,
} from '../../../domain/exceptions';
import {
  MOOD_REPOSITORY,
  type MoodRepository,
} from '../../../domain/ports/mood.repository';
import { RemoveMoodCommand } from '../remove-mood.command';

@CommandHandler(RemoveMoodCommand)
export class RemoveMoodHandler implements ICommandHandler<
  RemoveMoodCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
    @Inject(MOOD_REPOSITORY)
    private readonly moodRepository: MoodRepository,
  ) {}

  public async execute(
    command: RemoveMoodCommand,
  ): Promise<Result<void, DomainException>> {
    const entry = await this.journalEntryRepository.findByIdForOwner(
      command.journalEntryId,
      command.ownerId,
    );

    if (!entry) {
      return Result.fail(
        new JournalEntryNotFoundException(command.journalEntryId),
      );
    }

    if (entry.state !== JournalEntryState.DRAFT) {
      return Result.fail(
        new MoodJournalEntryNotEditableException(
          command.journalEntryId,
          entry.state,
        ),
      );
    }

    const mood = await this.moodRepository.findByJournalEntryIdForOwner(
      command.journalEntryId,
      command.ownerId,
    );

    if (!mood) {
      return Result.fail(new MoodNotFoundException(command.journalEntryId));
    }

    if (mood.revision !== command.expectedRevision) {
      return Result.fail(
        new MoodRevisionConflictException(
          command.journalEntryId,
          command.expectedRevision,
        ),
      );
    }

    const deleted = await this.moodRepository.deleteByJournalEntryIdForOwner(
      command.journalEntryId,
      command.ownerId,
      command.expectedRevision,
    );

    return deleted
      ? Result.ok(undefined)
      : Result.fail(
          new MoodRevisionConflictException(
            command.journalEntryId,
            command.expectedRevision,
          ),
        );
  }
}
