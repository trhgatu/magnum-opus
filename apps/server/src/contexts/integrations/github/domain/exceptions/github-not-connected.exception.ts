import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class GitHubNotConnectedException extends DomainException {
  constructor() {
    super('GitHub is not connected', Errors.GITHUB_NOT_CONNECTED);
  }
}
