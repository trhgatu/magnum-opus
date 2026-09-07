import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidProjectIdException extends DomainException {
  constructor() {
    super('Project ID must not be empty', Errors.INVALID_PROJECT_ID);
  }
}
