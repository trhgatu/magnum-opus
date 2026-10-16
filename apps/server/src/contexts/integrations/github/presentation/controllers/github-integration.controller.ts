import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { GitHubConnectionResponse } from '@repo/contracts';
import type { Response } from 'express';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  ConnectGitHubCommand,
  DisconnectGitHubCommand,
} from '../../application/commands';
import { CLOCK, type Clock } from '../../application/ports/clock.port';
import { GetGitHubConnectionQuery } from '../../application/queries';
import { ConnectGitHubDto } from '../dtos/connect-github.dto';
import { GitHubConnectionPresenter } from '../presenters/github-connection.presenter';

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
