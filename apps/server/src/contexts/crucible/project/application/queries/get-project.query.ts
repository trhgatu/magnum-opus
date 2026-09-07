import { IQuery } from '@nestjs/cqrs';

export class GetProjectQuery implements IQuery {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
  ) {}
}
