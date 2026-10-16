import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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
  // Token không bao giờ chứa khoảng trắng; chặn ở đây thay vì để GitHub trả 401.
  @Matches(/^\S+$/, { message: 'token must not contain whitespace' })
  token!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Required when the token belongs to another GitHub account',
  })
  @IsOptional()
  @IsBoolean()
  confirmAccountChange?: boolean;
}
