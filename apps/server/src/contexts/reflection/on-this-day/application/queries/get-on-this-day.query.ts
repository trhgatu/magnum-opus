import { IQuery } from '@nestjs/cqrs';

export class GetOnThisDayQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly now: Date = new Date(),
  ) {}
}
