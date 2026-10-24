import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class WakaTimeUnavailableException extends DomainException {
  constructor() {
    super('WakaTime is unavailable', Errors.WAKATIME_UNAVAILABLE);
  }
}
