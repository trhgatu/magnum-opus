import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  JOURNAL_ENTRY_REPOSITORY,
  type JournalEntryRepository,
} from '../../../domain/ports/journal-entry.repository';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { CreateJournalEntryCommand } from '../create-journal-entry.command';

@CommandHandler(CreateJournalEntryCommand)
export class CreateJournalEntryHandler implements ICommandHandler<
  CreateJournalEntryCommand,
  Result<JournalEntry, DomainException>
> {
  constructor(
    @Inject(JOURNAL_ENTRY_REPOSITORY)
    private readonly journalEntryRepository: JournalEntryRepository,
  ) {}

  public async execute(
    command: CreateJournalEntryCommand,
  ): Promise<Result<JournalEntry, DomainException>> {
    const entry = JournalEntry.createDraft({
      ownerId: command.ownerId,
      title: command.title,
      content: command.content,
    });

    await this.journalEntryRepository.create(entry);

    return Result.ok(entry);
  }
}
