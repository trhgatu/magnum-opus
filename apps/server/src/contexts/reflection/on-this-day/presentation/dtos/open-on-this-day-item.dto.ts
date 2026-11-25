import { ApiProperty } from '@nestjs/swagger';
import { ON_THIS_DAY_KINDS, type OnThisDayKind } from '@repo/contracts';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class OpenOnThisDayItemDto {
  @ApiProperty({ enum: ON_THIS_DAY_KINDS })
  @IsIn(ON_THIS_DAY_KINDS)
  readonly kind!: OnThisDayKind;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  readonly id!: string;
}
