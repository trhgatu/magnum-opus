import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class GetHabitCheckInsQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @Matches(CALENDAR_DATE_PATTERN)
  public from!: string;

  @ApiProperty({ example: '2026-12-31' })
  @Matches(CALENDAR_DATE_PATTERN)
  public to!: string;
}
