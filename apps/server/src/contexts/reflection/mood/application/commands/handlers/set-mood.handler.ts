import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  MoodJournalEntryNotEditableException,
  MoodJournalEntryNotFoundException,
  MoodRevisionConflictException,
} from '../../../domain/exceptions';
import { Mood } from '../../../domain/mood.aggregate';
import {
  MOOD_JOURNAL_ENTRY_READER,
  type MoodJournalEntryReader,
  MoodJournalEntryAccessStatus,
} from '../../ports/mood-journal-entry-reader.port';
import {
  MOOD_REPOSITORY,
  type MoodRepository,
} from '../../../domain/ports/mood.repository';
import { SetMoodCommand } from '../set-mood.command';

@CommandHandler(SetMoodCommand)
export class SetMoodHandler implements ICommandHandler<
  SetMoodCommand,
  Result<Mood, DomainException>
> {
  constructor(
    @Inject(MOOD_JOURNAL_ENTRY_READER)
    private readonly journalEntryReader: MoodJournalEntryReader,
    @Inject(MOOD_REPOSITORY)
    private readonly moodRepository: MoodRepository,
  ) {}

  public async execute(
    command: SetMoodCommand,
  ): Promise<Result<Mood, DomainException>> {
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

    const existingMood = await this.moodRepository.findByJournalEntryIdForOwner(
      command.journalEntryId,
      command.ownerId,
    );

    return existingMood
      ? this.updateMood(existingMood, command)
      : this.createMood(command);
  }

  private async createMood(
    command: SetMoodCommand,
  ): Promise<Result<Mood, DomainException>> {
    if (command.expectedRevision !== undefined) {
      return Result.fail(
        new MoodRevisionConflictException(
          command.journalEntryId,
          command.expectedRevision,
        ),
      );
    }

    try {
      const mood = Mood.create({
        journalEntryId: command.journalEntryId,
        label: command.label,
        intensity: command.intensity,
        note: command.note,
      });

      const created = await this.moodRepository.create(mood);

      return created
        ? Result.ok(mood)
        : Result.fail(
            new MoodRevisionConflictException(command.journalEntryId, null),
          );
    } catch (error: unknown) {
      if (error instanceof DomainException) {
        return Result.fail(error);
      }

      throw error;
    }
  }

  private async updateMood(
    mood: Mood,
    command: SetMoodCommand,
  ): Promise<Result<Mood, DomainException>> {
    if (
      command.expectedRevision === undefined ||
      mood.revision !== command.expectedRevision
    ) {
      return Result.fail(
        new MoodRevisionConflictException(
          command.journalEntryId,
          command.expectedRevision ?? null,
        ),
      );
    }

    try {
      const previousRevision = mood.revision;

      mood.update({
        label: command.label,
        intensity: command.intensity,
        note: command.note,
      });

      if (mood.revision === previousRevision) {
        return Result.ok(mood);
      }

      const updated = await this.moodRepository.update(
        mood,
        command.ownerId,
        command.expectedRevision,
      );

      return updated
        ? Result.ok(mood)
        : Result.fail(
            new MoodRevisionConflictException(
              command.journalEntryId,
              command.expectedRevision,
            ),
          );
    } catch (error: unknown) {
      if (error instanceof DomainException) {
        return Result.fail(error);
      }

      throw error;
    }
  }
}
