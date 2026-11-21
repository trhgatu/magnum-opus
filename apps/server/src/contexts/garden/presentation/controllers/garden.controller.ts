import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { GardenResponse } from '@repo/contracts';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import { GetGardenQuery } from '../../application/queries/get-garden.query';
import type { GardenResult } from '../../application/queries/handlers/get-garden.handler';
import { GardenPresenter } from '../presenters/garden.presenter';

@ApiTags('Garden')
@ApiBearerAuth()
@Controller('garden')
@UseGuards(JwtAuthGuard)
export class GardenController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: "Get the owner's garden as weekly series" })
  async get(@GetUser('id') ownerId: string): Promise<GardenResponse> {
    const result: GardenResult = await this.queryBus.execute(
      new GetGardenQuery(ownerId),
    );

    return GardenPresenter.toResponse(result);
  }
}
