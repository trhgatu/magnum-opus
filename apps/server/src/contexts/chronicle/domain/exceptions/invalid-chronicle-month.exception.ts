import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidChronicleMonthException extends DomainException {
  constructor(year: number, month: number) {
    super(
      `Chronicle month must be an integer year and a month from 1 to 12, got year=${year} month=${month}`,
      Errors.CHRONICLE_INVALID_MONTH,
      { year, month },
    );
  }
}
