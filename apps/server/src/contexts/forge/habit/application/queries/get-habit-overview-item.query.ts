import { IQuery } from '@nestjs/cqrs';

export class GetHabitOverviewItemQuery implements IQuery {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
