import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidQuitStartedAtException extends DomainException {
  constructor() {
    super(
      'quitStartedAt cannot be in the future',
      Errors.INVALID_QUIT_STARTED_AT,
    );
  }
}
