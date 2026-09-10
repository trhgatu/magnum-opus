import { ICommand } from '@nestjs/cqrs';

export class LogRelapseCommand implements ICommand {
  constructor(
    public readonly habitId: string,
    public readonly ownerId: string,
  ) {}
}
