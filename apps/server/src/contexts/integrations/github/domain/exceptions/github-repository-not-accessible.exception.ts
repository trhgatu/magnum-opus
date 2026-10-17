import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class GitHubRepositoryNotAccessibleException extends DomainException {
  constructor() {
    super(
      'GitHub repository is not accessible',
      Errors.GITHUB_REPOSITORY_NOT_ACCESSIBLE,
    );
  }
}
