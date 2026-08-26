import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  ROUTINE_READER,
  type RoutineReader,
  type FindRoutinesResult,
} from '../../ports/routine-reader.port';
import { GetRoutinesQuery } from '../get-routines.query';

@QueryHandler(GetRoutinesQuery)
export class GetRoutinesHandler implements IQueryHandler<
  GetRoutinesQuery,
  Result<FindRoutinesResult, DomainException>
> {
  constructor(
    @Inject(ROUTINE_READER)
    private readonly routineReader: RoutineReader,
  ) {}

  public async execute(
    query: GetRoutinesQuery,
  ): Promise<Result<FindRoutinesResult, DomainException>> {
    const result = await this.routineReader.findAllForOwner(query.ownerId, {
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
