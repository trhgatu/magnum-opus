import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class GitHubUnavailableException extends DomainException {
  constructor() {
    super('GitHub is unavailable', Errors.GITHUB_UNAVAILABLE);
  }
}
