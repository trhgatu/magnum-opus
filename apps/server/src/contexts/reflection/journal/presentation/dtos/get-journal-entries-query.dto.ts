import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';
import { JournalEntryState } from '../../domain/enums';

const JOURNAL_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;

export class GetJournalEntriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JournalEntryState })
  @IsOptional()
  @IsEnum(JournalEntryState)
  readonly state?: JournalEntryState;

  @ApiPropertyOptional({
    enum: JOURNAL_SORT_FIELDS,
    default: 'updatedAt',
  })
  @IsOptional()
  @IsIn(JOURNAL_SORT_FIELDS)
  declare readonly sortBy?: (typeof JOURNAL_SORT_FIELDS)[number];
}
