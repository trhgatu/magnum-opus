import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  HabitProgressResponse,
  HabitRelapseResponse,
} from '@repo/contracts';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import { LogRelapseCommand } from '../../application/commands';
import { GetHabitProgressQuery } from '../../application/queries';
import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitProgressPresenter } from '../presenters/habit-progress.presenter';
import { HabitRelapsePresenter } from '../presenters/habit-relapse.presenter';

@ApiTags('Habit relapses')
@ApiBearerAuth()
@Controller('habits/:habitId')
@UseGuards(JwtAuthGuard)
export class HabitRelapseController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('relapses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a relapse for an active QUIT-type Habit' })
  public async logRelapse(
    @GetUser('id') ownerId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
  ): Promise<HabitRelapseResponse> {
    const result = await this.commandBus.execute(
      new LogRelapseCommand(habitId, ownerId),
    );

    return HabitRelapsePresenter.toResponse(result.unwrap() as HabitRelapse);
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Get days since the last relapse for a QUIT-type Habit',
  })
  public async progress(
    @GetUser('id') ownerId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
  ): Promise<HabitProgressResponse> {
    const result = await this.queryBus.execute(
      new GetHabitProgressQuery(habitId, ownerId),
    );

    return HabitProgressPresenter.toResponse(result.unwrap());
  }
}
