import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JournalSummaryResponse } from '@repo/contracts';

import { GetUser } from '@presentation/decorators';
import { JwtAuthGuard } from '@presentation/guards';

import { GetJournalSummaryQuery } from '../../application/queries/get-journal-summary.query';

/** Tách khỏi /journal/entries để "summary" không trùng route :id. */
@ApiTags('Journal')
@ApiBearerAuth()
@Controller('journal/summary')
@UseGuards(JwtAuthGuard)
export class JournalSummaryController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'How many of the last seven days have a page' })
  public find(@GetUser('id') ownerId: string): Promise<JournalSummaryResponse> {
    return this.queryBus.execute(new GetJournalSummaryQuery(ownerId));
  }
}
