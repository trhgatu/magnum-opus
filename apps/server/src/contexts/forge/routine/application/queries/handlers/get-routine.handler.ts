import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { RoutineNotFoundException } from '../../../domain/exceptions';
import {
  ROUTINE_READER,
  RoutineDetailReadModel,
  type RoutineReader,
} from '../../ports/routine-reader.port';
import { GetRoutineQuery } from '../get-routine.query';

@QueryHandler(GetRoutineQuery)
export class GetRoutineHandler implements IQueryHandler<
  GetRoutineQuery,
  Result<RoutineDetailReadModel, DomainException>
> {
  constructor(
    @Inject(ROUTINE_READER)
    private readonly routineReader: RoutineReader,
  ) {}

  public async execute(
    query: GetRoutineQuery,
  ): Promise<Result<RoutineDetailReadModel, DomainException>> {
    const routine = await this.routineReader.findByIdForOwner(
      query.routineId,
      query.ownerId,
    );

    return routine
      ? Result.ok(routine)
      : Result.fail(new RoutineNotFoundException(query.routineId));
  }
}
