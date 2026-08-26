import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';
import { RoutineSortField } from '../../application/ports/routine-reader.port';

export const ROUTINE_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;

export type RoutineStatus = (typeof ROUTINE_STATUSES)[number];

const ROUTINE_SORT_FIELDS: RoutineSortField[] = [
  'title',
  'createdAt',
  'updatedAt',
];

export class GetRoutinesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ROUTINE_STATUSES,
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsIn(ROUTINE_STATUSES)
  readonly status: RoutineStatus = 'ACTIVE';

  @ApiPropertyOptional({
    enum: ROUTINE_SORT_FIELDS,
    default: 'updatedAt',
  })
  @IsOptional()
  @IsIn(ROUTINE_SORT_FIELDS)
  declare readonly sortBy?: RoutineSortField;
}
