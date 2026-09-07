import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidProjectTitleException extends DomainException {
  constructor() {
    super(
      'Project title must not be empty and must be 200 characters or fewer',
      Errors.INVALID_PROJECT_TITLE,
    );
  }
}
