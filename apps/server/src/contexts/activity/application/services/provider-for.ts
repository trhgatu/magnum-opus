import type { ActivityProvider } from '@repo/contracts';

import type { ActivityProviderPort } from '@shared/application/activity';

/** Provider đã đăng ký cho một nguồn; thiếu là lỗi cấu hình, nổ to. */
export function providerFor(
  providers: readonly ActivityProviderPort[],
  provider: ActivityProvider,
): ActivityProviderPort {
  const found = providers.find((candidate) => candidate.provider === provider);
  if (!found) {
    throw new Error(`No activity provider registered for ${provider}`);
  }
  return found;
}
