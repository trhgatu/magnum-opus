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
import type { JournalEntryResponse } from '@repo/contracts';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  CreateJournalEntryCommand,
  DeleteJournalEntryCommand,
  ReopenJournalEntryCommand,
  RestoreJournalEntryCommand,
  SealJournalEntryCommand,
  TrashJournalEntryCommand,
  UpdateJournalEntryCommand,
} from '../../application/commands';
import {
  GetJournalEntriesQuery,
  GetJournalEntryQuery,
} from '../../application/queries';
import { JournalEntry } from '../../domain/journal-entry.aggregate';
import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';
import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';
import {
  CreateJournalEntryDto,
  GetJournalEntriesQueryDto,
  JournalEntryRevisionDto,
  UpdateJournalEntryDto,
} from '../dtos';
import { JournalEntryPresenter } from '../presenters/journal-entry.presenter';

@ApiTags('Journal')
@ApiBearerAuth()
@Controller('journal/entries')
@UseGuards(JwtAuthGuard)
export class JournalController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a private journal draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  public async create(
    @GetUser('id') ownerId: string,
    @Body() body: CreateJournalEntryDto,
  ) {
    const result = await this.commandBus.execute(
      new CreateJournalEntryCommand({
        ownerId,
        title: body.title,
        content: body.content,
      }),
    );

    return JournalEntryPresenter.toResponse(result.unwrap());
  }

  @Get()
  @ApiOperation({ summary: 'List the current user journal entries' })
  public async findAll(
    @GetUser('id') ownerId: string,
    @Query() query: GetJournalEntriesQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetJournalEntriesQuery(
        ownerId,
        query.page,
        query.limit,
        query.state,
        query.search,
        query.sortBy,
        query.sortOrder,
      ),
    );
    const { entries, total } = result.unwrap() as {
      entries: JournalEntry[];
      total: number;
    };

    return PaginatedResponsePresenter.toResponse(
      entries.map((entry) => JournalEntryPresenter.toResponse(entry)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owned journal entry' })
  public async findOne(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) entryId: string,
  ) {
    const result = await this.queryBus.execute(
      new GetJournalEntryQuery(entryId, ownerId),
    );

    return JournalEntryPresenter.toResponse(result.unwrap());
  }

  @Put(':id')
  @ApiOperation({ summary: 'Autosave journal title and content' })
  public async update(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) entryId: string,
    @Body() body: UpdateJournalEntryDto,
  ) {
    const result = await this.commandBus.execute(
      new UpdateJournalEntryCommand(
        entryId,
        ownerId,
        body.expectedRevision,
        body.title,
        body.content,
      ),
    );

    return JournalEntryPresenter.toResponse(result.unwrap());
  }

  @Patch(':id/seal')
  public seal(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) entryId: string,
    @Body() body: JournalEntryRevisionDto,
  ) {
    return this.executeLifecycle(
      new SealJournalEntryCommand(entryId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/reopen')
  public reopen(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) entryId: string,
    @Body() body: JournalEntryRevisionDto,
  ) {
    return this.executeLifecycle(
      new ReopenJournalEntryCommand(entryId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/trash')
  public trash(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) entryId: string,
    @Body() body: JournalEntryRevisionDto,
  ) {
    return this.executeLifecycle(
      new TrashJournalEntryCommand(entryId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/restore')
  public restore(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) entryId: string,
    @Body() body: JournalEntryRevisionDto,
  ) {
    return this.executeLifecycle(
      new RestoreJournalEntryCommand(entryId, ownerId, body.expectedRevision),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete an entry from trash' })
  public async deletePermanently(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) entryId: string,
    @Query() query: JournalEntryRevisionDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new DeleteJournalEntryCommand(entryId, ownerId, query.expectedRevision),
    );

    result.unwrap();
  }

  private async executeLifecycle(
    command: ICommand,
  ): Promise<JournalEntryResponse> {
    const result = await this.commandBus.execute(command);
    return JournalEntryPresenter.toResponse(result.unwrap());
  }
}
