import { IQuery } from '@nestjs/cqrs';

import { HabitSortField } from '../ports/habit-reader.port';

export class GetHabitsQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly isActive?: boolean,
    public readonly search?: string,
    public readonly sortBy?: HabitSortField,
    public readonly sortOrder?: 'asc' | 'desc',
  ) {}
}
