import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  WakaTimeConnectionResponse,
  WakaTimeProjectResponse,
} from '@repo/contracts';
import type { Response } from 'express';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import {
  ConnectWakaTimeCommand,
  DisconnectWakaTimeCommand,
} from '../../application/commands';
import {
  GetWakaTimeConnectionQuery,
  ListWakaTimeProjectsQuery,
} from '../../application/queries';
import { ConnectWakaTimeDto } from '../dtos/connect-wakatime.dto';
import { WakaTimeConnectionPresenter } from '../presenters/wakatime-connection.presenter';
import { ListWakaTimeProjectsDto } from '../dtos/list-wakatime-projects.dto';
import { WakaTimeProjectPresenter } from '../presenters/wakatime-project.presenter';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations/wakatime')
@UseGuards(JwtAuthGuard)
export class WakaTimeIntegrationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get the WakaTime connection of the current user',
    description: '204 No Content when WakaTime is not connected.',
  })
  @ApiOkResponse({ description: 'WakaTimeConnectionResponse — connected' })
  @ApiNoContentResponse({ description: 'WakaTime is not connected' })
  async getConnection(
    @GetUser('id') ownerId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WakaTimeConnectionResponse | undefined> {
    const result = await this.queryBus.execute(
      new GetWakaTimeConnectionQuery({ ownerId }),
    );
    const connection = result.unwrap();

    if (!connection) {
      response.status(HttpStatus.NO_CONTENT);
      return undefined;
    }

    return WakaTimeConnectionPresenter.toResponse(connection);
  }

  @Get('projects')
  @ApiOperation({
    summary: 'List the WakaTime projects of the connected account',
    description: 'Most recently coded first.',
  })
  @ApiOkResponse({ description: 'WakaTimeProjectResponse[]' })
  async listProjects(
    @GetUser('id') ownerId: string,
    @Query() query: ListWakaTimeProjectsDto,
  ): Promise<WakaTimeProjectResponse[]> {
    const result = await this.queryBus.execute(
      new ListWakaTimeProjectsQuery({ ownerId, search: query.search }),
    );

    return WakaTimeProjectPresenter.toListResponse(result.unwrap());
  }

  @Put()
  @ApiOperation({ summary: 'Connect WakaTime or replace the API key' })
  async connect(
    @GetUser('id') ownerId: string,
    @Body() dto: ConnectWakaTimeDto,
  ): Promise<WakaTimeConnectionResponse> {
    const result = await this.commandBus.execute(
      new ConnectWakaTimeCommand({
        ownerId,
        apiKey: dto.apiKey,
        confirmAccountChange: dto.confirmAccountChange ?? false,
      }),
    );

    return WakaTimeConnectionPresenter.toResponse(result.unwrap());
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect WakaTime' })
  async disconnect(@GetUser('id') ownerId: string): Promise<void> {
    const result = await this.commandBus.execute(
      new DisconnectWakaTimeCommand({ ownerId }),
    );
    result.unwrap();
  }
}
