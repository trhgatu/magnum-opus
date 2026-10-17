import { ApiProperty } from '@nestjs/swagger';
import { ACTIVITY_PROVIDERS, type ActivityProvider } from '@repo/contracts';
import { IsIn, Matches } from 'class-validator';

export class LinkActivitySourceDto {
  @ApiProperty({ enum: ACTIVITY_PROVIDERS })
  @IsIn(ACTIVITY_PROVIDERS)
  readonly provider!: ActivityProvider;

  @ApiProperty({
    description: 'Stable numeric id of the repository',
    example: '1067270000',
  })
  // Id số của GitHub: chỉ chữ số, không phải tên — đổi tên không làm mất nguồn.
  @Matches(/^\d{1,20}$/, {
    message: 'externalResourceId must be a numeric repository id',
  })
  readonly externalResourceId!: string;
}
