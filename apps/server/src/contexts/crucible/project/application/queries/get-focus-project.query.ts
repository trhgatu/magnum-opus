import { IQuery } from '@nestjs/cqrs';

export class GetFocusProjectQuery implements IQuery {
  constructor(public readonly ownerId: string) {}
}
