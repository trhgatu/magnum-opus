import { IQuery } from '@nestjs/cqrs';

export class GetJournalEntryQuery implements IQuery {
  constructor(
    public readonly entryId: string,
    public readonly ownerId: string,
  ) {}
}
