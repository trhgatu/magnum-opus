import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListWakaTimeProjectsDto {
  @ApiPropertyOptional({
    description: 'Filter by project name, case-insensitive',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly search?: string;
}
