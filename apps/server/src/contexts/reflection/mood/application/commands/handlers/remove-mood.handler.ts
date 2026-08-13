import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  MoodJournalEntryNotEditableException,
  MoodJournalEntryNotFoundException,
  MoodNotFoundException,
  MoodRevisionConflictException,
} from '../../../domain/exceptions';
import {
  MOOD_JOURNAL_ENTRY_READER,
  type MoodJournalEntryReader,
  MoodJournalEntryAccessStatus,
} from '../../ports/mood-journal-entry-reader.port';
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
    @Inject(MOOD_JOURNAL_ENTRY_READER)
    private readonly journalEntryReader: MoodJournalEntryReader,
    @Inject(MOOD_REPOSITORY)
    private readonly moodRepository: MoodRepository,
  ) {}

  public async execute(
    command: RemoveMoodCommand,
  ): Promise<Result<void, DomainException>> {
    const access = await this.journalEntryReader.getAccessForOwner(
      command.journalEntryId,
      command.ownerId,
    );

    if (access.status === MoodJournalEntryAccessStatus.NOT_FOUND) {
      return Result.fail(
        new MoodJournalEntryNotFoundException(command.journalEntryId),
      );
    }

    if (access.status === MoodJournalEntryAccessStatus.NOT_EDITABLE) {
      return Result.fail(
        new MoodJournalEntryNotEditableException(
          command.journalEntryId,
          access.state,
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
