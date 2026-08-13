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
import type { MemoryResponse } from '@repo/contracts';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';
import { PaginatedResponsePresenter } from '@presentation/common/presenters/pagination.presenter';

import {
  CreateMemoryCommand,
  DeleteMemoryCommand,
  RestoreMemoryCommand,
  TrashMemoryCommand,
  UpdateMemoryCommand,
} from '../../application/commands';
import { GetMemoriesQuery, GetMemoryQuery } from '../../application/queries';
import { Memory } from '../../domain/memory.aggregate';
import {
  CreateMemoryDto,
  GetMemoriesQueryDto,
  MemoryRevisionDto,
  UpdateMemoryDto,
} from '../dtos';
import { MemoryPresenter } from '../presenters/memory.presenter';

@ApiTags('Memories')
@ApiBearerAuth()
@Controller('memories')
@UseGuards(JwtAuthGuard)
export class MemoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a private Memory' })
  public async create(
    @GetUser('id') ownerId: string,
    @Body() body: CreateMemoryDto,
  ): Promise<MemoryResponse> {
    const result = await this.commandBus.execute(
      new CreateMemoryCommand({
        ownerId,
        sourceJournalEntryId: body.sourceJournalEntryId,
        title: body.title,
        content: body.content,
        occurredOn: body.occurredOn,
        occurredOnPrecision: body.occurredOnPrecision,
      }),
    );

    return MemoryPresenter.toResponse(result.unwrap());
  }

  @Get()
  @ApiOperation({ summary: 'List the current user Memories' })
  public async findAll(
    @GetUser('id') ownerId: string,
    @Query() query: GetMemoriesQueryDto,
  ) {
    const result = await this.queryBus.execute(
      new GetMemoriesQuery(
        ownerId,
        query.page,
        query.limit,
        query.state,
        query.search,
        query.sortBy,
        query.sortOrder,
      ),
    );
    const { memories, total } = result.unwrap() as {
      memories: Memory[];
      total: number;
    };

    return PaginatedResponsePresenter.toResponse(
      memories.map((memory) => MemoryPresenter.toResponse(memory)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owned Memory' })
  public async findOne(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
  ): Promise<MemoryResponse> {
    const result = await this.queryBus.execute(
      new GetMemoryQuery(memoryId, ownerId),
    );
    return MemoryPresenter.toResponse(result.unwrap());
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an active Memory' })
  public async update(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
    @Body() body: UpdateMemoryDto,
  ): Promise<MemoryResponse> {
    const result = await this.commandBus.execute(
      new UpdateMemoryCommand(
        memoryId,
        ownerId,
        body.expectedRevision,
        body.title,
        body.content,
        body.occurredOn,
        body.occurredOnPrecision,
      ),
    );
    return MemoryPresenter.toResponse(result.unwrap());
  }

  @Patch(':id/trash')
  public trash(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
    @Body() body: MemoryRevisionDto,
  ) {
    return this.executeLifecycle(
      new TrashMemoryCommand(memoryId, ownerId, body.expectedRevision),
    );
  }

  @Patch(':id/restore')
  public restore(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
    @Body() body: MemoryRevisionDto,
  ) {
    return this.executeLifecycle(
      new RestoreMemoryCommand(memoryId, ownerId, body.expectedRevision),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a Memory from Trash' })
  public async deletePermanently(
    @GetUser('id') ownerId: string,
    @Param('id', new ParseUUIDPipe()) memoryId: string,
    @Query() query: MemoryRevisionDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new DeleteMemoryCommand(memoryId, ownerId, query.expectedRevision),
    );
    result.unwrap();
  }

  private async executeLifecycle(command: ICommand): Promise<MemoryResponse> {
    const result = await this.commandBus.execute(command);
    return MemoryPresenter.toResponse(result.unwrap());
  }
}
