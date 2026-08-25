import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, type ICommand, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HabitResponse } from '@repo/contracts';

import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';
import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  ArchiveHabitCommand,
  CreateHabitCommand,
  RestoreHabitCommand,
  UpdateHabitCommand,
} from '../../application/commands';
import { GetHabitQuery, GetHabitsQuery } from '../../application/queries';
import { Habit } from '../../domain/habit.aggregate';
import {
  CreateHabitDto,
  GetHabitsQueryDto,
  HabitRevisionDto,
  UpdateHabitDto,
} from '../dtos';
import { HabitPresenter } from '../presenters/habit.presenter';

@ApiTags('Habits')
@ApiBearerAuth()
@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a private Habit' })
  public async create(
    @GetUser('id') ownerId: string,
    @Body() body: CreateHabitDto,
  ): Promise<HabitResponse> {
    const result = await this.commandBus.execute(
      new CreateHabitCommand({
        ownerId,
        title: body.title,
        description: body.description,
        frequencyType: body.frequencyType,
        frequencyDays: body.frequencyDays,
      }),
    );

    return HabitPresenter.toResponse(result.unwrap());
  }

  @Get()
  @ApiOperation({ summary: 'List the current user Habits' })
  public async findAll(
    @GetUser('id') ownerId: string,
    @Query() query: GetHabitsQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetHabitsQuery(
        ownerId,
        query.page,
        query.limit,
        query.status === 'ACTIVE',
        query.search,
        query.sortBy,
        query.sortOrder,
      ),
    );
    const { habits, total } = result.unwrap() as {
      habits: Habit[];
      total: number;
    };

    return PaginatedResponsePresenter.toResponse(
      habits.map((habit) => HabitPresenter.toResponse(habit)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owned Habit' })
  public async findOne(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) habitId: string,
  ): Promise<HabitResponse> {
    const result = await this.queryBus.execute(
      new GetHabitQuery(habitId, ownerId),
    );

    return HabitPresenter.toResponse(result.unwrap());
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an active Habit' })
  public async update(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) habitId: string,
    @Body() body: UpdateHabitDto,
  ): Promise<HabitResponse> {
    const result = await this.commandBus.execute(
      new UpdateHabitCommand({
        habitId,
        ownerId,
        expectedRevision: body.expectedRevision,
        title: body.title,
        description: body.description,
        frequencyType: body.frequencyType,
        frequencyDays: body.frequencyDays,
      }),
    );

    return HabitPresenter.toResponse(result.unwrap());
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive an active Habit' })
  public archive(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) habitId: string,
    @Body() body: HabitRevisionDto,
  ): Promise<HabitResponse> {
    return this.executeLifecycle(
      new ArchiveHabitCommand(habitId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore an archived Habit' })
  public restore(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) habitId: string,
    @Body() body: HabitRevisionDto,
  ): Promise<HabitResponse> {
    return this.executeLifecycle(
      new RestoreHabitCommand(habitId, ownerId, body.expectedRevision),
    );
  }

  private async executeLifecycle(command: ICommand): Promise<HabitResponse> {
    const result = await this.commandBus.execute(command);
    return HabitPresenter.toResponse(result.unwrap());
  }
}
