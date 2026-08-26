import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { RoutineNotFoundException } from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../../../domain/ports/routine.repository';
import { GetRoutineQuery } from '../get-routine.query';

@QueryHandler(GetRoutineQuery)
export class GetRoutineHandler implements IQueryHandler<
  GetRoutineQuery,
  Result<Routine, DomainException>
> {
  constructor(
    @Inject(ROUTINE_REPOSITORY)
    private readonly routineRepository: RoutineRepository,
  ) {}

  public async execute(
    query: GetRoutineQuery,
  ): Promise<Result<Routine, DomainException>> {
    const routine = await this.routineRepository.findByIdForOwner(
      query.routineId,
      query.ownerId,
    );

    return routine
      ? Result.ok(routine)
      : Result.fail(new RoutineNotFoundException(query.routineId));
  }
}
