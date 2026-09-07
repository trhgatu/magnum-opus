import {
  Body,
  Controller,
  Delete,
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
import type { ProjectResponse } from '@repo/contracts';

import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';
import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  CompleteProjectCommand,
  CreateProjectCommand,
  DeleteProjectCommand,
  PauseProjectCommand,
  ReopenProjectCommand,
  ResumeProjectCommand,
  SetIntendedOutcomeCommand,
  StartProjectCommand,
  StopProjectCommand,
  UpdateProjectCommand,
} from '../../application/commands';
import { GetProjectQuery, GetProjectsQuery } from '../../application/queries';
import { ProjectLifecycleState as DomainProjectLifecycleState } from '../../domain/enums';
import {
  CreateProjectDto,
  GetProjectsQueryDto,
  ProjectRevisionDto,
  SetIntendedOutcomeDto,
  UpdateProjectDto,
} from '../dtos';
import { ProjectPresenter } from '../presenters/project.presenter';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a private Project' })
  public async create(
    @GetUser('id') ownerId: string,
    @Body() body: CreateProjectDto,
  ): Promise<ProjectResponse> {
    const result = await this.commandBus.execute(
      new CreateProjectCommand({
        ownerId,
        title: body.title,
        description: body.description,
      }),
    );

    return ProjectPresenter.toResponse(result.unwrap());
  }

  @Get()
  @ApiOperation({ summary: 'List the current user Projects' })
  public async findAll(
    @GetUser('id') ownerId: string,
    @Query() query: GetProjectsQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetProjectsQuery(
        ownerId,
        query.page,
        query.limit,
        query.search,
        query.state as unknown as DomainProjectLifecycleState,
      ),
    );
    const { projects, total } = result.unwrap();

    return PaginatedResponsePresenter.toResponse(
      projects.map((project) => ProjectPresenter.toResponse(project)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owned Project' })
  public async findOne(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
  ): Promise<ProjectResponse> {
    const result = await this.queryBus.execute(
      new GetProjectQuery(projectId, ownerId),
    );

    return ProjectPresenter.toResponse(result.unwrap());
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update Project information' })
  public update(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: UpdateProjectDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new UpdateProjectCommand(
        projectId,
        ownerId,
        body.expectedRevision,
        body.title,
        body.description,
      ),
    );
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start a NOT_STARTED Project' })
  public start(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: ProjectRevisionDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new StartProjectCommand(projectId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause an ACTIVE Project' })
  public pause(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: ProjectRevisionDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new PauseProjectCommand(projectId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume a PAUSED Project' })
  public resume(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: ProjectRevisionDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new ResumeProjectCommand(projectId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/stop')
  @ApiOperation({ summary: 'Stop a Project without declaring completion' })
  public stop(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: ProjectRevisionDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new StopProjectCommand(projectId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Declare the current Project Cycle complete' })
  public complete(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: ProjectRevisionDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new CompleteProjectCommand(projectId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reopen a STOPPED or COMPLETED Project' })
  public reopen(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: ProjectRevisionDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new ReopenProjectCommand(projectId, ownerId, body.expectedRevision),
    );
  }

  @Put(':id/cycle/outcome')
  @ApiOperation({ summary: 'Set or update the current Cycle intended outcome' })
  public setIntendedOutcome(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() body: SetIntendedOutcomeDto,
  ): Promise<ProjectResponse> {
    return this.executeLifecycle(
      new SetIntendedOutcomeCommand(
        projectId,
        ownerId,
        body.expectedRevision,
        body.intendedOutcome,
      ),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete a Project that has never had a Cycle',
  })
  public async delete(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Query() query: ProjectRevisionDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new DeleteProjectCommand(projectId, ownerId, query.expectedRevision),
    );
    result.unwrap();
  }

  private async executeLifecycle(command: ICommand): Promise<ProjectResponse> {
    const result = await this.commandBus.execute(command);
    return ProjectPresenter.toResponse(result.unwrap());
  }
}
