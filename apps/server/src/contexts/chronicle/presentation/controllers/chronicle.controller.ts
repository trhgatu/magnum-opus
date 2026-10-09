import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ChronicleResponse } from '@repo/contracts';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  GetMonthlyChronicleQuery,
  type MonthlyChronicleReadModel,
} from '../../application/queries';
import { ChroniclePresenter } from '../presenters/chronicle.presenter';

@ApiTags('Chronicle')
@ApiBearerAuth()
@Controller('chronicle')
@UseGuards(JwtAuthGuard)
export class ChronicleController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':year/:month')
  @ApiOperation({
    summary: 'Get the current user Chronicle for one month',
  })
  public async getMonthly(
    @GetUser('id') ownerId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ): Promise<ChronicleResponse> {
    const result = await this.queryBus.execute(
      new GetMonthlyChronicleQuery(ownerId, year, month),
    );

    return ChroniclePresenter.toResponse(
      result.unwrap() as MonthlyChronicleReadModel,
    );
  }
}
