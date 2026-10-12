import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidTargetEndDateException extends DomainException {
  constructor(value: string) {
    super(
      `Target end date must be a real calendar date in YYYY-MM-DD format: "${value}"`,
      Errors.INVALID_TARGET_END_DATE,
      { value },
    );
  }
}
