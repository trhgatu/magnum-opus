import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateTimeZoneDto {
  @ApiProperty({
    example: 'Asia/Ho_Chi_Minh',
    description: 'IANA time zone name',
  })
  @IsString()
  @MaxLength(64)
  timeZone!: string;
}
