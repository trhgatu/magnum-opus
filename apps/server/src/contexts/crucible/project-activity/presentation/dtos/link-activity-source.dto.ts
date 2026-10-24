import { ApiProperty } from '@nestjs/swagger';
import type { ActivityProvider } from '@repo/contracts';
import { IsIn, Matches } from 'class-validator';

/**
 * Provider gắn được làm nguồn lúc này. WAKATIME đã có trong contract (sổ
 * biết nó) nhưng chỉ gắn được khi adapter và API sẵn sàng (BA 08 §10, PR 7d).
 */
const LINKABLE_PROVIDERS = [
  'GITHUB',
] as const satisfies readonly ActivityProvider[];

export class LinkActivitySourceDto {
  @ApiProperty({ enum: LINKABLE_PROVIDERS })
  @IsIn(LINKABLE_PROVIDERS)
  readonly provider!: ActivityProvider;

  @ApiProperty({
    description: 'Stable numeric id of the repository',
    example: '1067270000',
  })
  // Id số của GitHub: chỉ chữ số, không phải tên — đổi tên không làm mất nguồn.
  // Không có số 0 ở đầu: "0106…" và "106…" không được thành hai nguồn.
  @Matches(/^[1-9]\d{0,18}$/, {
    message: 'externalResourceId must be a numeric repository id',
  })
  readonly externalResourceId!: string;
}
