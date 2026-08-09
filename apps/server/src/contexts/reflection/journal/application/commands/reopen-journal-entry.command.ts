import { ICommand } from '@nestjs/cqrs';

export class ReopenJournalEntryCommand implements ICommand {
  constructor(
    public readonly entryId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
