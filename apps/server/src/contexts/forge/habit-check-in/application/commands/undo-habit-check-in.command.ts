import { ICommand } from '@nestjs/cqrs';

export class UndoHabitCheckInCommand implements ICommand {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
