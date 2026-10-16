import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class GitHubTokenInsufficientScopeException extends DomainException {
  constructor() {
    super(
      'GitHub token cannot read repositories',
      Errors.GITHUB_TOKEN_INSUFFICIENT_SCOPE,
    );
  }
}
