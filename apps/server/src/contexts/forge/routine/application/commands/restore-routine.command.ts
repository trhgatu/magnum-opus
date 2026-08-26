import { ICommand } from '@nestjs/cqrs';

export class RestoreRoutineCommand implements ICommand {
  constructor(
    public readonly routineId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
