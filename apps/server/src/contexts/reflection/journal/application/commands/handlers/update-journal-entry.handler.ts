import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { JournalEntryMutationService } from '../../services';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { UpdateJournalEntryCommand } from '../update-journal-entry.command';

@CommandHandler(UpdateJournalEntryCommand)
export class UpdateJournalEntryHandler implements ICommandHandler<
  UpdateJournalEntryCommand,
  Result<JournalEntry, DomainException>
> {
  constructor(private readonly mutationService: JournalEntryMutationService) {}

  public async execute(
    command: UpdateJournalEntryCommand,
  ): Promise<Result<JournalEntry, DomainException>> {
    return this.mutationService.mutate({
      entryId: command.entryId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (entry) => {
        entry.updateContent({
          title: command.title,
          content: command.content,
        });
      },
    });
  }
}
