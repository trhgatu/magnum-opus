import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class GitHubTokenInsufficientScopeException extends DomainException {
  constructor() {
    super('GitHub rejected the token', Errors.GITHUB_TOKEN_INVALID);
  }
}
