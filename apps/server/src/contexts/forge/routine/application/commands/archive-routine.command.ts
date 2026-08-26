import { ICommand } from '@nestjs/cqrs';

export class ArchiveRoutineCommand implements ICommand {
  constructor(
    public readonly routineId: string,
    public readonly ownerId: string,
    public readonly expectedRevision: number,
  ) {}
}
