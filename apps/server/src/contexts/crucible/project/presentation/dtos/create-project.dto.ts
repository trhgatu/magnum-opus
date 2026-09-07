import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  readonly description?: string | null;
}
