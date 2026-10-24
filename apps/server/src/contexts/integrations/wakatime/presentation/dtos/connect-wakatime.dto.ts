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
    description: 'WakaTime secret API key (wakatime.com/settings/api-key)',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  // Key không bao giờ chứa khoảng trắng; chặn ở đây thay vì để WakaTime trả 401.
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
