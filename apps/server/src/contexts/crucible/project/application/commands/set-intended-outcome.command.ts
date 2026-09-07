import { ICommand } from '@nestjs/cqrs';

export class SetIntendedOutcomeCommand implements ICommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
    public readonly intendedOutcome: string,
  ) {}
}
