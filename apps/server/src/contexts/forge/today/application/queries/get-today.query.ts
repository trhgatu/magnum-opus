import { IQuery } from '@nestjs/cqrs';

export class GetTodayQuery implements IQuery {
  constructor(public readonly ownerId: string) {}
}
