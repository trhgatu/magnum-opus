import { IQuery } from '@nestjs/cqrs';

export class GetRoutineQuery implements IQuery {
  constructor(
    public readonly routineId: string,
    public readonly ownerId: string,
  ) {}
}
