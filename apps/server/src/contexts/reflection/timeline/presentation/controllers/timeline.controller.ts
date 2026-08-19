import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';
import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';
import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import { GetTimelineQuery } from '../../application/queries/get-timeline.query';
import type { FindTimelineResult } from '../../application/ports/timeline-reader.port';
import { TimelineEntryPresenter } from '../presenters/timeline-entry.presenter';

@ApiTags('Timeline')
@ApiBearerAuth()
@Controller('reflection/timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'List the chronological reflection Timeline for the owner',
  })
  async findAll(
    @GetUser('id') ownerId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetTimelineQuery(ownerId, query.page, query.limit),
    );
    const { entries, total } = result.unwrap() as FindTimelineResult;

    return PaginatedResponsePresenter.toResponse(
      entries.map((entry) => TimelineEntryPresenter.toResponse(entry)),
      total,
      query.page,
      query.limit,
    );
  }
}
