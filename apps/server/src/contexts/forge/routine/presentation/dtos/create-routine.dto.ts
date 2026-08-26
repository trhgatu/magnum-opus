import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateRoutineDto {
  @ApiProperty({
    maxLength: 200,
    example: 'Morning ritual',
  })
  @MaxLength(200)
  @IsString()
  readonly title!: string;
}
