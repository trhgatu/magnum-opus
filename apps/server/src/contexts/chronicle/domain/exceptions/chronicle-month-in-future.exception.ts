import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class ChronicleMonthInFutureException extends DomainException {
  constructor(year: number, month: number) {
    super(
      `Cannot view Chronicle for a future month: year=${year} month=${month}`,
      Errors.CHRONICLE_MONTH_IN_FUTURE,
      { year, month },
    );
  }
}
