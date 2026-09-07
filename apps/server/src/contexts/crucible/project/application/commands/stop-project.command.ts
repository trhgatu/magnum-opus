import { ICommand } from '@nestjs/cqrs';

export class StopProjectCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
