import { ICommand } from '@nestjs/cqrs';

export class StartProjectCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
