import { ICommand } from '@nestjs/cqrs';

export class PauseProjectCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
