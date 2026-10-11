import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Errors } from '@repo/contracts';

export class InvalidTimeZoneException extends DomainException {
  constructor(timeZone: string) {
    super(`Invalid time zone: "${timeZone}"`, Errors.INVALID_TIME_ZONE, {
      timeZone,
    });
  }
}
