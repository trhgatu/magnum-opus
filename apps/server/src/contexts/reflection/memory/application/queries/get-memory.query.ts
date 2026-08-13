import { IQuery } from '@nestjs/cqrs';

export class GetMemoryQuery implements IQuery {
  constructor(
    public readonly memoryId: string,
    public readonly ownerId: string,
  ) {}
}
