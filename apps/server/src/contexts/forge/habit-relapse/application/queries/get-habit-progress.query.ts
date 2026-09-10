import { IQuery } from '@nestjs/cqrs';

export class GetHabitProgressQuery implements IQuery {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
