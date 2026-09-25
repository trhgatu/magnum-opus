import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsUUID, Min } from 'class-validator';

export class ReorderRoutineHabitsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
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
