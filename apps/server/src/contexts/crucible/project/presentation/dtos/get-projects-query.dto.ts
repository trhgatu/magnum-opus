import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  PROJECT_LIFECYCLE_STATES,
  type ProjectLifecycleState,
} from '@repo/contracts';

export class GetProjectsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  readonly limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly search?: string;

  @ApiPropertyOptional({ enum: PROJECT_LIFECYCLE_STATES })
  @IsOptional()
  @IsIn(PROJECT_LIFECYCLE_STATES)
  readonly state?: ProjectLifecycleState;
}
