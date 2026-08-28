import { IQuery } from '@nestjs/cqrs';

export class GetAvailableRoutineHabitsQuery implements IQuery {
  constructor(
    public readonly routineId: string,
    public readonly ownerId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly search?: string,
  ) {}
}
