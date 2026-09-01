import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ForgeTodayResponse } from '@repo/contracts';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import type { TodayReadModel } from '../../application/ports/today-reader.port';
import { GetTodayQuery } from '../../application/queries';
import { TodayPresenter } from '../presenters/today.presenter';

@ApiTags('Forge Today')
@ApiBearerAuth()
@Controller('forge/today')
@UseGuards(JwtAuthGuard)
export class TodayController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'Get the current user Forge today',
  })
  public async getToday(
    @GetUser('id') ownerId: string,
  ): Promise<ForgeTodayResponse> {
    const result = await this.queryBus.execute(new GetTodayQuery(ownerId));

    return TodayPresenter.toResponse(result.unwrap() as TodayReadModel);
  }
}
