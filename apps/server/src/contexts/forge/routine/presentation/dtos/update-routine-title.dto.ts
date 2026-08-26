import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, MaxLength, Min } from 'class-validator';

export class UpdateRoutineTitleDto {
  @ApiProperty({
    maxLength: 200,
    example: 'Evening ritual',
  })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiProperty({
    minimum: 1,
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
