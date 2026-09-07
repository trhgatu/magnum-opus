import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  readonly title!: string;

  @ApiProperty({ nullable: true })
  @IsDefined()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  readonly description!: string | null;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;
}
