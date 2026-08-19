import { IQuery } from '@nestjs/cqrs';

export class GetTimelineQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly page = 1,
    public readonly limit = 20,
  ) {}
}
