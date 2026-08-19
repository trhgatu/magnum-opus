import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { GetTimelineQuery } from '../get-timeline.query';
import {
  TIMELINE_READER,
  type FindTimelineResult,
  type TimelineReader,
} from '../../ports/timeline-reader.port';

@QueryHandler(GetTimelineQuery)
export class GetTimelineHandler implements IQueryHandler<
  GetTimelineQuery,
  Result<FindTimelineResult, DomainException>
> {
  constructor(
    @Inject(TIMELINE_READER)
    private readonly reader: TimelineReader,
  ) {}

  async execute(
    query: GetTimelineQuery,
  ): Promise<Result<FindTimelineResult, DomainException>> {
    const skip = (query.page - 1) * query.limit;
    const result = await this.reader.findAllForOwner(query.ownerId, {
      skip,
      take: query.limit,
    });
    return Result.ok(result);
  }
}
