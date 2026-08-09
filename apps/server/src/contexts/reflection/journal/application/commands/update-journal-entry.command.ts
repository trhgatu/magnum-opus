import { ICommand } from '@nestjs/cqrs';

export class UpdateJournalEntryCommand implements ICommand {
  constructor(
    public readonly entryId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
    public readonly title: string | null,
    public readonly content: string,
  ) {}
}
