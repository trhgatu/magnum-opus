import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

import { MemoryDatePrecision } from '../../domain/enums';

export class CreateMemoryDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  readonly sourceJournalEntryId?: string | null;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiProperty()
  @IsString()
  readonly content!: string;

  @ApiPropertyOptional({ example: '2024-08-01', nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readonly occurredOn?: string | null;

  @ApiPropertyOptional({
    enum: MemoryDatePrecision,
    default: MemoryDatePrecision.UNKNOWN,
  })
  @IsOptional()
  @IsEnum(MemoryDatePrecision)
  readonly occurredOnPrecision?: MemoryDatePrecision;
}
