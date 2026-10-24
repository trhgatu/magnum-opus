import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class WakaTimeNotConnectedException extends DomainException {
  constructor() {
    super('WakaTime is not connected', Errors.WAKATIME_NOT_CONNECTED);
  }
}
