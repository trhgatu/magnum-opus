import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { HabitFrequencyType } from '../../domain/enums';

export class CreateHabitDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  readonly description?: string | null;

  @ApiProperty({ enum: HabitFrequencyType })
  @IsEnum(HabitFrequencyType)
  readonly frequencyType!: HabitFrequencyType;

  @ApiPropertyOptional({ type: [Number], example: [1, 3, 5] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  readonly frequencyDays?: number[];
}
