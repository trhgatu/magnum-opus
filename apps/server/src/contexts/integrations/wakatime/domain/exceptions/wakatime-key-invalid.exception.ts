import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class WakaTimeKeyInvalidException extends DomainException {
  constructor() {
    super('WakaTime rejected the token', Errors.WAKATIME_KEY_INVALID);
  }
}
