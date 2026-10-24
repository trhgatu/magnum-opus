import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class WakaTimeAccountChangeUnconfirmedException extends DomainException {
  constructor(currentAccount: string, newAccount: string) {
    super(
      `WakaTime key belongs to "${newAccount}", not the connected "${currentAccount}"`,
      Errors.WAKATIME_ACCOUNT_CHANGE_UNCONFIRMED,
      { currentAccount, newAccount },
    );
  }
}
