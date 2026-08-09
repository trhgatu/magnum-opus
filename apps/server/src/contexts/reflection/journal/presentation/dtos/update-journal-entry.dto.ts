import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateJournalEntryDto {
  @ApiProperty({ maxLength: 200, nullable: true })
  @IsDefined()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(200)
  readonly title!: string | null;

  @ApiProperty()
  @IsDefined()
  @IsString()
  readonly content!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
