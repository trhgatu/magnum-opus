import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConnectGitHubDto {
  @ApiProperty({
    description: 'Fine-grained personal access token, read-only',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Required when the token belongs to another GitHub account',
  })
  @IsOptional()
  @IsBoolean()
  confirmAccountChange?: boolean;
}
