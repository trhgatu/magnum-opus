import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OnThisDayResponse } from '@repo/contracts';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import type { OnThisDay } from '../../application/queries/handlers/get-on-this-day.handler';
import { GetOnThisDayQuery } from '../../application/queries/get-on-this-day.query';

@ApiTags('Reflection')
@ApiBearerAuth()
@Controller('reflection/on-this-day')
@UseGuards(JwtAuthGuard)
export class OnThisDayController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'Memories and journal pages from this day in past years',
  })
  public async find(
    @GetUser('id') ownerId: string,
  ): Promise<OnThisDayResponse> {
    const result = await this.queryBus.execute(new GetOnThisDayQuery(ownerId));
    const { date, items } = result.unwrap() as OnThisDay;

    return {
      date,
      items: items.map(({ kind, id, title, excerpt, day, yearsAgo }) => ({
        kind,
        id,
        title,
        excerpt,
        day,
        yearsAgo,
      })),
    };
  }
}
