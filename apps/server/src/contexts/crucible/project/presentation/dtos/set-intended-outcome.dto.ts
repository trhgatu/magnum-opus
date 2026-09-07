import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class SetIntendedOutcomeDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;

  @ApiProperty()
  @IsString()
  readonly intendedOutcome!: string;
}
