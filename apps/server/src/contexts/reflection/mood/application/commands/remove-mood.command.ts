import { ICommand } from '@nestjs/cqrs';

export class RemoveMoodCommand implements ICommand {
  constructor(
    public readonly journalEntryId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
