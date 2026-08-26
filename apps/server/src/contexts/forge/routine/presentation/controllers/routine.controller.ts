import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, type ICommand, QueryBus } from '@nestjs/cqrs';
import type { RoutineResponse } from '@repo/contracts';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';
import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  AddRoutineHabitCommand,
  ArchiveRoutineCommand,
  CreateRoutineCommand,
  MoveRoutineHabitDownCommand,
  MoveRoutineHabitUpCommand,
  RemoveRoutineHabitCommand,
  RestoreRoutineCommand,
  UpdateRoutineTitleCommand,
} from '../../application/commands';
import { GetRoutineQuery, GetRoutinesQuery } from '../../application/queries';
import { Routine } from '../../domain/routine.aggregate';
import {
  AddRoutineHabitDto,
  CreateRoutineDto,
  GetRoutinesQueryDto,
  RoutineRevisionDto,
  UpdateRoutineTitleDto,
} from '../dtos';
import { RoutinePresenter } from '../presenters/routine.presenter';

@ApiTags('Routines')
@ApiBearerAuth()
@Controller('routines')
@UseGuards(JwtAuthGuard)
export class RoutineController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a private Routine',
  })
  public async create(
    @GetUser('id') ownerId: string,
    @Body() body: CreateRoutineDto,
  ): Promise<RoutineResponse> {
    const result = await this.commandBus.execute(
      new CreateRoutineCommand({
        ownerId,
        title: body.title,
      }),
    );

    return RoutinePresenter.toResponse(result.unwrap());
  }

  @Get()
  @ApiOperation({
    summary: 'List the current user Routines',
  })
  public async findAll(
    @GetUser('id') ownerId: string,
    @Query() query: GetRoutinesQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetRoutinesQuery(
        ownerId,
        query.page,
        query.limit,
        query.status === 'ACTIVE',
        query.search,
        query.sortBy,
        query.sortOrder,
      ),
    );

    const { routines, total } = result.unwrap() as {
      routines: Routine[];
      total: number;
    };

    return PaginatedResponsePresenter.toResponse(
      routines.map((routine) => RoutinePresenter.toResponse(routine)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one owned Routine',
  })
  public async findOne(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
  ): Promise<RoutineResponse> {
    const result = await this.queryBus.execute(
      new GetRoutineQuery(routineId, ownerId),
    );

    return RoutinePresenter.toResponse(result.unwrap());
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update an active Routine title',
  })
  public updateTitle(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
    @Body() body: UpdateRoutineTitleDto,
  ): Promise<RoutineResponse> {
    return this.executeMutation(
      new UpdateRoutineTitleCommand({
        routineId,
        ownerId,
        title: body.title,
        expectedRevision: body.expectedRevision,
      }),
    );
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive an active Routine',
  })
  public archive(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
    @Body() body: RoutineRevisionDto,
  ): Promise<RoutineResponse> {
    return this.executeMutation(
      new ArchiveRoutineCommand(routineId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore an archived Routine',
  })
  public restore(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
    @Body() body: RoutineRevisionDto,
  ): Promise<RoutineResponse> {
    return this.executeMutation(
      new RestoreRoutineCommand(routineId, ownerId, body.expectedRevision),
    );
  }

  @Post(':id/habits')
  @ApiOperation({
    summary: 'Add an active owned Habit to a Routine',
  })
  public addHabit(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
    @Body() body: AddRoutineHabitDto,
  ): Promise<RoutineResponse> {
    return this.executeMutation(
      new AddRoutineHabitCommand({
        routineId,
        ownerId,
        habitId: body.habitId,
        expectedRevision: body.expectedRevision,
      }),
    );
  }

  @Delete(':id/habits/:habitId')
  @ApiOperation({
    summary: 'Remove a Habit from a Routine',
  })
  public removeHabit(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
    @Query() query: RoutineRevisionDto,
  ): Promise<RoutineResponse> {
    return this.executeMutation(
      new RemoveRoutineHabitCommand({
        routineId,
        ownerId,
        habitId,
        expectedRevision: query.expectedRevision,
      }),
    );
  }

  @Patch(':id/habits/:habitId/up')
  @ApiOperation({
    summary: 'Move a Routine Habit one position up',
  })
  public moveHabitUp(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
    @Body() body: RoutineRevisionDto,
  ): Promise<RoutineResponse> {
    return this.executeMutation(
      new MoveRoutineHabitUpCommand({
        routineId,
        ownerId,
        habitId,
        expectedRevision: body.expectedRevision,
      }),
    );
  }

  @Patch(':id/habits/:habitId/down')
  @ApiOperation({
    summary: 'Move a Routine Habit one position down',
  })
  public moveHabitDown(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) routineId: string,
    @Param('habitId', new ParseUUIDPipe()) habitId: string,
    @Body() body: RoutineRevisionDto,
  ): Promise<RoutineResponse> {
    return this.executeMutation(
      new MoveRoutineHabitDownCommand({
        routineId,
        ownerId,
        habitId,
        expectedRevision: body.expectedRevision,
      }),
    );
  }

  private async executeMutation(command: ICommand): Promise<RoutineResponse> {
    const result = await this.commandBus.execute(command);

    return RoutinePresenter.toResponse(result.unwrap());
  }
}
