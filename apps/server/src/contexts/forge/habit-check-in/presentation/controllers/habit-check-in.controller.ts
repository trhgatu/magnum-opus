import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  HabitCheckInHistoryResponse,
  HabitCheckInResponse,
  HabitCheckInTodayResponse,
} from '@repo/contracts';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  CheckInHabitCommand,
  UndoHabitCheckInCommand,
} from '../../application/commands';
import { HabitCheckInReadModel } from '../../application/ports/habit-check-in-reader.port';
import {
  GetHabitCheckInsQuery,
  GetHabitCheckInTodayQuery,
} from '../../application/queries';
import type { HabitCheckInTodayResult } from '../../application/queries/handlers/get-habit-check-in-today.handler';
import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { GetHabitCheckInsQueryDto } from '../dtos';
import { HabitCheckInPresenter } from '../presenters/habit-check-in.presenter';

@ApiTags('Habit check-ins')
@ApiBearerAuth()
@Controller('habits/:habitId/check-ins')
@UseGuards(JwtAuthGuard)
export class HabitCheckInController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Put('today')
  @ApiOperation({ summary: 'Idempotently check in an active Habit today' })
  public async checkIn(
    @GetUser('id') ownerId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
  ): Promise<HabitCheckInResponse> {
    const result = await this.commandBus.execute(
      new CheckInHabitCommand(habitId, ownerId),
    );

    return HabitCheckInPresenter.toResponse(result.unwrap() as HabitCheckIn);
  }

  @Delete('today')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Undo today's Habit check-in" })
  public async undo(
    @GetUser('id') ownerId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new UndoHabitCheckInCommand(habitId, ownerId),
    );
    result.unwrap();
  }

  @Get()
  @ApiOperation({ summary: 'Get owned Habit check-ins in a date range' })
  public async history(
    @GetUser('id') ownerId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
    @Query() query: GetHabitCheckInsQueryDto,
  ): Promise<HabitCheckInHistoryResponse> {
    const result = await this.queryBus.execute(
      new GetHabitCheckInsQuery(habitId, ownerId, query.from, query.to),
    );

    return HabitCheckInPresenter.toHistoryResponse(
      habitId,
      query.from,
      query.to,
      result.unwrap() as HabitCheckInReadModel[],
    );
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's owner-timezone check-in status" })
  public async today(
    @GetUser('id') ownerId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
  ): Promise<HabitCheckInTodayResponse> {
    const result = await this.queryBus.execute(
      new GetHabitCheckInTodayQuery(habitId, ownerId),
    );
    const today = result.unwrap() as HabitCheckInTodayResult;

    return HabitCheckInPresenter.toTodayResponse(today.date, today.checkIn);
  }
}
