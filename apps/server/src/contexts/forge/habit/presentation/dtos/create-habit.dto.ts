import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { HabitFrequencyType, HabitType } from '../../domain/enums';

export class CreateHabitDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  readonly description?: string | null;

  @ApiProperty({ enum: HabitType })
  @IsEnum(HabitType)
  readonly type!: HabitType;

  @ApiPropertyOptional({
    enum: HabitFrequencyType,
    description: 'Required when type is BUILD, forbidden for QUIT',
  })
  @ValidateIf((dto: CreateHabitDto) => dto.type === HabitType.BUILD)
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
    description:
      'Only meaningful for QUIT; defaults to today when omitted, must not be in the future',
  })
  @ValidateIf(
    (dto: CreateHabitDto) =>
      dto.type === HabitType.QUIT && dto.quitStartedAt !== undefined,
  )
  @IsDateString()
  readonly quitStartedAt?: string;
}
