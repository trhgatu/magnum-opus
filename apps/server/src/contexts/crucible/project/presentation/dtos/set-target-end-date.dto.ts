import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, ValidateIf } from 'class-validator';

export class SetTargetEndDateDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly expectedRevision!: number;

  @ApiProperty({
    nullable: true,
    example: '2026-09-30',
    description: 'Date-only "YYYY-MM-DD"; null để xóa',
  })
  @ValidateIf((dto: SetTargetEndDateDto) => dto.targetEndAt !== null)
  @IsString()
  readonly targetEndAt!: string | null;
}
