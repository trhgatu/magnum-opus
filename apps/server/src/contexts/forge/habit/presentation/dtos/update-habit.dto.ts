import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { HabitFrequencyType } from '../../domain/enums';

export class UpdateHabitDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiProperty({ nullable: true })
  @IsDefined()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  readonly description!: string | null;

  @ApiPropertyOptional({
    enum: HabitFrequencyType,
    description: 'Required when the Habit is BUILD, forbidden for QUIT',
  })
  @IsOptional()
  @IsEnum(HabitFrequencyType)
  readonly frequencyType?: HabitFrequencyType;

  @ApiPropertyOptional({ type: [Number], example: [1, 3, 5] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  readonly frequencyDays?: number[];

  @ApiPropertyOptional({
    description: 'Required when the Habit is QUIT, forbidden for BUILD',
  })
  @IsOptional()
  @IsDateString()
  readonly quitStartedAt?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
