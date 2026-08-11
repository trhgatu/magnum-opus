import { IQuery } from '@nestjs/cqrs';

export class GetMoodQuery implements IQuery {
  constructor(
    public readonly journalEntryId: string,
    public readonly ownerId: string,
  ) {}
}
