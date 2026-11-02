import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ConnectWakaTimeDto {
  @ApiProperty({
    description:
      'WakaTime personal OAuth token with read_heartbeats (wakatime.com/oauth). API keys can no longer read data.',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  // Token không bao giờ chứa khoảng trắng; chặn ở đây thay vì để WakaTime trả 401.
  @Matches(/^\S+$/, { message: 'apiKey must not contain whitespace' })
  apiKey!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Required when the key belongs to another WakaTime account',
  })
  @IsOptional()
  @IsBoolean()
  confirmAccountChange?: boolean;
}
