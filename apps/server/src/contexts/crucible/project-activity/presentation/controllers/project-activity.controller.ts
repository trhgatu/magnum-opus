import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  ActivitySourceResponse,
  CycleActivitySnapshotResponse,
  ProjectActivityResponse,
} from '@repo/contracts';
import type { Response } from 'express';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  LinkActivitySourceCommand,
  UnlinkActivitySourceCommand,
} from '../../application/commands';
import {
  GetProjectActivityQuery,
  ListActivitySourcesQuery,
  ListCycleSnapshotsQuery,
} from '../../application/queries';
import { LinkActivitySourceDto } from '../dtos/link-activity-source.dto';
import { ProjectActivityPresenter } from '../presenters/project-activity.presenter';

@ApiTags('Project Activity')
@ApiBearerAuth()
@Controller('projects/:id/activity')
@UseGuards(JwtAuthGuard)
export class ProjectActivityController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Activity of the current cycle, set beside the declaration',
    description:
      'Copies stale sources within a time limit first. Source errors never ' +
      'fail the request; they are reported on each source.',
  })
  @ApiOkResponse({ description: 'ProjectActivityResponse' })
  async getActivity(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
  ): Promise<ProjectActivityResponse> {
    const result = await this.queryBus.execute(
      new GetProjectActivityQuery({ ownerId, projectId }),
    );
    return ProjectActivityPresenter.toResponse(result.unwrap());
  }

  @Get('snapshots')
  @ApiOperation({
    summary: 'Activity snapshots of closed cycles, newest first',
    description:
      'Exactly as captured when each cycle closed; never recomputed.',
  })
  @ApiOkResponse({ description: 'CycleActivitySnapshotResponse[]' })
  async listSnapshots(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
  ): Promise<CycleActivitySnapshotResponse[]> {
    const result = await this.queryBus.execute(
      new ListCycleSnapshotsQuery({ ownerId, projectId }),
    );
    return result
      .unwrap()
      .map((snapshot) => ProjectActivityPresenter.toSnapshotResponse(snapshot));
  }

  @Get('sources')
  @ApiOperation({ summary: 'Sources linked to the project (read-only)' })
  @ApiOkResponse({ description: 'ActivitySourceResponse[], oldest link first' })
  async listSources(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
  ): Promise<ActivitySourceResponse[]> {
    const result = await this.queryBus.execute(
      new ListActivitySourcesQuery({ ownerId, projectId }),
    );
    return result
      .unwrap()
      .map((source) => ProjectActivityPresenter.toSourceResponse(source));
  }

  @Post('sources')
  @ApiOperation({
    summary: 'Link a source to the project',
    description: '201 when linked now; 200 when it was already a source.',
  })
  @ApiCreatedResponse({ description: 'ActivitySourceResponse — linked now' })
  @ApiOkResponse({ description: 'ActivitySourceResponse — already linked' })
  async linkSource(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() dto: LinkActivitySourceDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ActivitySourceResponse> {
    const result = await this.commandBus.execute(
      new LinkActivitySourceCommand({
        ownerId,
        projectId,
        provider: dto.provider,
        externalResourceId: dto.externalResourceId,
      }),
    );
    const { source, created } = result.unwrap();

    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return ProjectActivityPresenter.toSourceResponse(source);
  }

  @Delete('sources/:feedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unlink a source',
    description: 'Removes the link only; the ledger and snapshots stay.',
  })
  @ApiNoContentResponse({ description: 'Unlinked' })
  async unlinkSource(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Param('feedId', new ParseUUIDPipe()) feedId: string,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new UnlinkActivitySourceCommand({ ownerId, projectId, feedId }),
    );
    result.unwrap();
  }
}
