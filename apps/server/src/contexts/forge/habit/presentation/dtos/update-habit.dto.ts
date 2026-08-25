import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
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

  @ApiProperty({ enum: HabitFrequencyType })
  @IsEnum(HabitFrequencyType)
  readonly frequencyType!: HabitFrequencyType;

  @ApiProperty({ type: [Number], example: [1, 3, 5] })
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  readonly frequencyDays!: number[];

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
