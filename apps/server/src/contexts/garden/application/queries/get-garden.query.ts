import { IQuery } from '@nestjs/cqrs';

export class GetGardenQuery implements IQuery {
  constructor(public readonly ownerId: string) {}
}
