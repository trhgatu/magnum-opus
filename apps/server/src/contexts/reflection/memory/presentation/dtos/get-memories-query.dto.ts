import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';

import { MemoryState } from '../../domain/enums';

const MEMORY_SORT_FIELDS = ['occurredOn', 'createdAt', 'updatedAt'] as const;

export class GetMemoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MemoryState })
  @IsOptional()
  @IsEnum(MemoryState)
  readonly state?: MemoryState;

  @ApiPropertyOptional({ enum: MEMORY_SORT_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsIn(MEMORY_SORT_FIELDS)
  declare readonly sortBy?: (typeof MEMORY_SORT_FIELDS)[number];

  @ApiPropertyOptional({
    description: 'Chỉ trả Memory được tạo từ Journal entry này',
  })
  @IsOptional()
  @IsUUID()
  readonly sourceJournalEntryId?: string;
}
