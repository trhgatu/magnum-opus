import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  HABIT_READER,
  type FindHabitsResult,
  type HabitReader,
} from '../../ports/habit-reader.port';
import { GetHabitsQuery } from '../get-habits.query';

@QueryHandler(GetHabitsQuery)
export class GetHabitsHandler implements IQueryHandler<
  GetHabitsQuery,
  Result<FindHabitsResult, DomainException>
> {
  constructor(
    @Inject(HABIT_READER)
    private readonly habitReader: HabitReader,
  ) {}

  public async execute(
    query: GetHabitsQuery,
  ): Promise<Result<FindHabitsResult, DomainException>> {
    const result = await this.habitReader.findAllForOwner(query.ownerId, {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      isActive: query.isActive,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return Result.ok(result);
  }
}
