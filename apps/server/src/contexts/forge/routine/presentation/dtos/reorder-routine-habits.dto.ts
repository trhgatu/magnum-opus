import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min } from 'class-validator';

export class ReorderRoutineHabitsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @IsUUID('4', { each: true })
  readonly habitIds!: string[];

  @ApiProperty({
    minimum: 1,
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
