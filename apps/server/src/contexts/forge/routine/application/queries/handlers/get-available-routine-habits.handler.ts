import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { RoutineNotFoundException } from '../../../domain/exceptions';
import {
  ROUTINE_READER,
  type FindAvailableRoutineHabitsResult,
  type RoutineReader,
} from '../../ports/routine-reader.port';

import { GetAvailableRoutineHabitsQuery } from '../get-available-routine-habits.query';

@QueryHandler(GetAvailableRoutineHabitsQuery)
export class GetAvailableRoutineHabitsHandler implements IQueryHandler<
  GetAvailableRoutineHabitsQuery,
  Result<FindAvailableRoutineHabitsResult, DomainException>
> {
  constructor(
    @Inject(ROUTINE_READER)
    private readonly routineReader: RoutineReader,
  ) {}

  public async execute(
    query: GetAvailableRoutineHabitsQuery,
  ): Promise<Result<FindAvailableRoutineHabitsResult, DomainException>> {
    const result = await this.routineReader.findAvailableHabitsForOwner(
      query.routineId,
      query.ownerId,
      {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        search: query.search,
      },
    );
    return result
      ? Result.ok(result)
      : Result.fail(new RoutineNotFoundException(query.routineId));
  }
}
