import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class WakaTimeRateLimitedException extends DomainException {
  constructor(retryAfter: number) {
    super(
      `WakaTime rate limit reached; retry after ${retryAfter}s`,
      Errors.WAKATIME_RATE_LIMITED,
      { retryAfter },
    );
  }
}
