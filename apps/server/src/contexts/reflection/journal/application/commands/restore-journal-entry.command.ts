import { ICommand } from '@nestjs/cqrs';

export class RestoreJournalEntryCommand implements ICommand {
  constructor(
    public readonly entryId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
