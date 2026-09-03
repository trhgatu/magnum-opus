import { ICommand } from '@nestjs/cqrs';

export class CheckInHabitCommand implements ICommand {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
