import { ICommand } from '@nestjs/cqrs';

export class UpdateProjectCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
    public readonly title: string,
    public readonly description: string | null,
  ) {}
}
