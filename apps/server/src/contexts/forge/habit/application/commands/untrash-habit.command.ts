import { ICommand } from '@nestjs/cqrs';

export class UntrashHabitCommand implements ICommand {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
