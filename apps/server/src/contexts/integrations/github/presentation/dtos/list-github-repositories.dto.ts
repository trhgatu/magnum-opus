import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListGitHubRepositoriesDto {
  @ApiPropertyOptional({
    description: 'Filter by repository name, case-insensitive',
  })
  @IsOptional()
  @IsString()
  // Tên đầy đủ trên GitHub (owner/repo) không dài quá 140 ký tự.
  @MaxLength(140)
  readonly search?: string;
}
