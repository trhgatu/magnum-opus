import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  TODAY_READER,
  type TodayReadModel,
  type TodayReader,
} from '../../ports/today-reader.port';
import { TODAY_CLOCK, type TodayClock } from '../../ports/today-clock.port';

import { GetTodayQuery } from '../get-today.query';

@QueryHandler(GetTodayQuery)
export class GetTodayHandler implements IQueryHandler<
  GetTodayQuery,
  Result<TodayReadModel, DomainException>
> {
  constructor(
    @Inject(TODAY_CLOCK)
    private readonly clock: TodayClock,
    @Inject(TODAY_READER)
    private readonly reader: TodayReader,
  ) {}

  public async execute(
    query: GetTodayQuery,
  ): Promise<Result<TodayReadModel, DomainException>> {
    const instant = this.clock.now();

    const today = await this.reader.findForOwnerAt(query.ownerId, instant);
    return Result.ok(today);
  }
}
