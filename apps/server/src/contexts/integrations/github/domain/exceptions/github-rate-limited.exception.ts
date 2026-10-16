import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class GitHubRateLimitedException extends DomainException {
  constructor(retryAfter: number) {
    super(
      `GitHub rate limit reached; retry after ${retryAfter}s`,
      Errors.GITHUB_RATE_LIMITED,
      { retryAfter },
    );
  }
}
