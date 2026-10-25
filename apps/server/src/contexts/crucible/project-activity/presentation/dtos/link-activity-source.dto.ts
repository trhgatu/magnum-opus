import { ApiProperty } from '@nestjs/swagger';
import type { ActivityProvider } from '@repo/contracts';
import {
  IsIn,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/** Provider gắn được làm nguồn (BA 08 §9.2). */
const LINKABLE_PROVIDERS = [
  'GITHUB',
  'WAKATIME',
] as const satisfies readonly ActivityProvider[];

type LinkableProvider = (typeof LINKABLE_PROVIDERS)[number];

/** Id của tài nguyên, theo từng provider — luôn là id ổn định, không phải tên. */
const RESOURCE_ID_FORMAT: Record<LinkableProvider, RegExp> = {
  // Id số của GitHub. Không có số 0 ở đầu: "0106…" và "106…" không được
  // thành hai nguồn.
  GITHUB: /^[1-9]\d{0,18}$/,
  // Id project của WakaTime. Id lạ thì resolveResource không tìm thấy nên
  // không tạo được nguồn.
  WAKATIME: /^[A-Za-z0-9-]{1,64}$/,
};

@ValidatorConstraint({ name: 'externalResourceIdFormat' })
class ExternalResourceIdFormat implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const { provider } = args.object as { provider?: unknown };
    const format = LINKABLE_PROVIDERS.find((linkable) => linkable === provider);
    return (
      format !== undefined &&
      typeof value === 'string' &&
      RESOURCE_ID_FORMAT[format].test(value)
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const { provider } = args.object as { provider?: unknown };
    return provider === 'WAKATIME'
      ? 'externalResourceId must be a WakaTime project id'
      : 'externalResourceId must be a numeric repository id';
  }
}

export class LinkActivitySourceDto {
  @ApiProperty({ enum: LINKABLE_PROVIDERS })
  @IsIn(LINKABLE_PROVIDERS)
  readonly provider!: ActivityProvider;

  @ApiProperty({
    description:
      'Stable id of the resource: numeric repository id for GitHub, ' +
      'project id for WakaTime',
    example: '1067270000',
  })
  @Validate(ExternalResourceIdFormat)
  readonly externalResourceId!: string;
}
