import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJournalEntryDto {
  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly title?: string | null;

  @ApiPropertyOptional({ default: '' })
  @IsOptional()
  @IsString()
  readonly content?: string;
}
