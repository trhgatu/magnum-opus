import { ICommand } from '@nestjs/cqrs';

export class ResumeProjectCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
