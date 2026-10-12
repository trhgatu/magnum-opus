import { ICommand } from '@nestjs/cqrs';

export class SetTargetEndDateCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
    public readonly targetEndAt: string | null,
  ) {}
}
