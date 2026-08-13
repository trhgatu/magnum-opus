import { ICommand } from '@nestjs/cqrs';

export class RestoreMemoryCommand implements ICommand {
  constructor(
    public readonly memoryId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
