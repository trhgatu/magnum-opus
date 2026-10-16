import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  GitHubConnectionResponse,
  GitHubRepositoryListResponse,
} from '@repo/contracts';
import type { Response } from 'express';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  ConnectGitHubCommand,
  DisconnectGitHubCommand,
} from '../../application/commands';
import { CLOCK, type Clock } from '../../application/ports/clock.port';
import {
  GetGitHubConnectionQuery,
  ListGitHubRepositoriesQuery,
} from '../../application/queries';
import { ConnectGitHubDto } from '../dtos/connect-github.dto';
import { ListGitHubRepositoriesDto } from '../dtos/list-github-repositories.dto';
import { GitHubConnectionPresenter } from '../presenters/github-connection.presenter';
import { GitHubRepositoryPresenter } from '../presenters/github-repository.presenter';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations/github')
@UseGuards(JwtAuthGuard)
export class GitHubIntegrationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the GitHub connection of the current user',
    description: '204 No Content when GitHub is not connected.',
  })
  @ApiOkResponse({ description: 'GitHubConnectionResponse — connected' })
  @ApiNoContentResponse({ description: 'GitHub is not connected' })
  async getConnection(
    @GetUser('id') ownerId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GitHubConnectionResponse | undefined> {
    const result = await this.queryBus.execute(
      new GetGitHubConnectionQuery({ ownerId }),
    );
    const connection = result.unwrap();

    if (!connection) {
      response.status(HttpStatus.NO_CONTENT);
      return undefined;
    }

    return GitHubConnectionPresenter.toResponse(connection, this.clock.now());
  }

  @Get('repositories')
  @ApiOperation({
    summary: 'List repositories the GitHub token can read',
    description:
      'Most recently pushed first, at most 100. Search is applied across ' +
      'every repository before the limit.',
  })
  @ApiOkResponse({ description: 'GitHubRepositoryListResponse' })
  async listRepositories(
    @GetUser('id') ownerId: string,
    @Query() query: ListGitHubRepositoriesDto,
  ): Promise<GitHubRepositoryListResponse> {
    const result = await this.queryBus.execute(
      new ListGitHubRepositoriesQuery({ ownerId, search: query.search }),
    );

    return GitHubRepositoryPresenter.toListResponse(result.unwrap());
  }

  @Put()
  @ApiOperation({ summary: 'Connect GitHub or replace the token' })
  async connect(
    @GetUser('id') ownerId: string,
    @Body() dto: ConnectGitHubDto,
  ): Promise<GitHubConnectionResponse> {
    const result = await this.commandBus.execute(
      new ConnectGitHubCommand({
        ownerId,
        token: dto.token,
        confirmAccountChange: dto.confirmAccountChange ?? false,
      }),
    );

    return GitHubConnectionPresenter.toResponse(
      result.unwrap(),
      this.clock.now(),
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect GitHub' })
  async disconnect(@GetUser('id') ownerId: string): Promise<void> {
    const result = await this.commandBus.execute(
      new DisconnectGitHubCommand({ ownerId }),
    );
    result.unwrap();
  }
}
