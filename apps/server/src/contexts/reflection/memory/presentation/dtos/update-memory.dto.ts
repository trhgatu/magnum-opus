import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { MemoryDatePrecision } from '../../domain/enums';

export class UpdateMemoryDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiProperty()
  @IsString()
  readonly content!: string;

  @ApiProperty({ example: '2024-08-01', nullable: true })
  @IsDefined()
  @ValidateIf((_object, value) => value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readonly occurredOn!: string | null;

  @ApiProperty({ enum: MemoryDatePrecision })
  @IsEnum(MemoryDatePrecision)
  readonly occurredOnPrecision!: MemoryDatePrecision;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
