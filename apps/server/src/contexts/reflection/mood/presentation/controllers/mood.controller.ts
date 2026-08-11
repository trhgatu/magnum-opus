import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { MoodResponse } from '@repo/contracts';
import type { Response } from 'express';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import { RemoveMoodCommand, SetMoodCommand } from '../../application/commands';
import { GetMoodQuery } from '../../application/queries';
import { MoodRevisionDto, SetMoodDto } from '../dtos';
import { MoodPresenter } from '../presenters/mood.presenter';

@ApiTags('Mood')
@ApiBearerAuth()
@Controller('journal/entries/:entryId/mood')
@UseGuards(JwtAuthGuard)
export class MoodController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the Mood attached to an owned Journal entry' })
  @ApiResponse({ status: 200, description: 'Mood found' })
  @ApiResponse({ status: 204, description: 'The Journal entry has no Mood' })
  public async findOne(
    @GetUser('id') ownerId: string,
    @Param('entryId', new ParseUUIDPipe()) journalEntryId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MoodResponse | void> {
    const result = await this.queryBus.execute(
      new GetMoodQuery(journalEntryId, ownerId),
    );
    const mood = result.unwrap();

    if (!mood) {
      response.status(HttpStatus.NO_CONTENT);
      return;
    }

    return MoodPresenter.toResponse(mood);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update Mood for a Journal draft' })
  public async set(
    @GetUser('id') ownerId: string,
    @Param('entryId', new ParseUUIDPipe()) journalEntryId: string,
    @Body() body: SetMoodDto,
  ): Promise<MoodResponse> {
    const result = await this.commandBus.execute(
      new SetMoodCommand(
        journalEntryId,
        ownerId,
        body.label,
        body.intensity,
        body.note,
        body.expectedRevision,
      ),
    );

    return MoodPresenter.toResponse(result.unwrap());
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove Mood from a Journal draft' })
  public async remove(
    @GetUser('id') ownerId: string,
    @Param('entryId', new ParseUUIDPipe()) journalEntryId: string,
    @Query() query: MoodRevisionDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new RemoveMoodCommand(journalEntryId, ownerId, query.expectedRevision),
    );

    result.unwrap();
  }
}
