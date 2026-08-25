import { IQuery } from '@nestjs/cqrs';

export class GetHabitQuery implements IQuery {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
