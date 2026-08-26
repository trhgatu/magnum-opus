import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsUUID } from 'class-validator';

export class AddRoutineHabitDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  readonly habitId!: string;

  @ApiProperty({
    minimum: 1,
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
