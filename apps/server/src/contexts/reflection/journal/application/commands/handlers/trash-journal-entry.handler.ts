import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { JournalEntryMutationService } from '../../services';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';
import { TrashJournalEntryCommand } from '../trash-journal-entry.command';

@CommandHandler(TrashJournalEntryCommand)
export class TrashJournalEntryHandler implements ICommandHandler<
  TrashJournalEntryCommand,
  Result<JournalEntry, DomainException>
> {
  constructor(private readonly mutationService: JournalEntryMutationService) {}

  public execute(
    command: TrashJournalEntryCommand,
  ): Promise<Result<JournalEntry, DomainException>> {
    return this.mutationService.mutate({
      entryId: command.entryId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (entry) => entry.moveToTrash(),
    });
  }
}
