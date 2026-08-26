import { IQuery } from '@nestjs/cqrs';

import { RoutineSortField } from '../ports/routine-reader.port';

export class GetRoutinesQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly isActive?: boolean,
    public readonly search?: string,
    public readonly sortBy?: RoutineSortField,
    public readonly sortOrder?: 'asc' | 'desc',
  ) {}
}
