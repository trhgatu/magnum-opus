import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class GitHubAccountChangeUnconfirmedException extends DomainException {
  constructor(currentAccount: string, newAccount: string) {
    super(
      `GitHub token belongs to "${newAccount}", not the connected "${currentAccount}"`,
      Errors.GITHUB_ACCOUNT_CHANGE_UNCONFIRMED,
      { currentAccount, newAccount },
    );
  }
}
