import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { MoodLabel } from '../../domain/enums';

export class SetMoodDto {
  @ApiProperty({ enum: MoodLabel })
  @IsEnum(MoodLabel)
  readonly label!: MoodLabel;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  readonly intensity?: number | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string | null;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly expectedRevision?: number;
}
