import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@presentation/common/dto/pagination-query.dto';

import { HabitSortField } from '../../application/ports/habit-reader.port';

export const HABIT_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type HabitStatus = (typeof HABIT_STATUSES)[number];

const HABIT_SORT_FIELDS: HabitSortField[] = ['title', 'createdAt', 'updatedAt'];

export class GetHabitsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: HABIT_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(HABIT_STATUSES)
  readonly status: HabitStatus = 'ACTIVE';

  @ApiPropertyOptional({ enum: HABIT_SORT_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsIn(HABIT_SORT_FIELDS)
  declare readonly sortBy?: HabitSortField;
}
