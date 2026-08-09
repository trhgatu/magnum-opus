import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { JournalEntryState } from '../../../domain/enums';
import {
  JournalEntryNotFoundException,
  JournalEntryPermanentDeleteForbiddenException,
  JournalEntryRevisionConflictException,
} from '../../../domain/exceptions';
import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '../../../domain/ports/journal-entry.repository';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { DeleteJournalEntryCommand } from '../delete-journal-entry.command';

@CommandHandler(DeleteJournalEntryCommand)
export class DeleteJournalEntryHandler implements ICommandHandler<
  DeleteJournalEntryCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
  ) {}

  public async execute(
    command: DeleteJournalEntryCommand,
  ): Promise<Result<void, DomainException>> {
    const entry = await this.journalEntryRepository.findByIdForOwner(
      command.entryId,
      command.ownerId,
    );

    if (!entry) {
      return Result.fail(new JournalEntryNotFoundException(command.entryId));
    }

    if (entry.revision !== command.expectedRevision) {
      return Result.fail(
        new JournalEntryRevisionConflictException(
          command.entryId,
          command.expectedRevision,
        ),
      );
    }

    if (entry.state !== JournalEntryState.TRASHED) {
      return Result.fail(
        new JournalEntryPermanentDeleteForbiddenException(command.entryId),
      );
    }

    const deleted = await this.journalEntryRepository.deletePermanently(
      command.entryId,
      command.ownerId,
      command.expectedRevision,
    );

    if (!deleted) {
      return Result.fail(
        new JournalEntryRevisionConflictException(
          command.entryId,
          command.expectedRevision,
        ),
      );
    }

    return Result.ok(undefined);
  }
}
