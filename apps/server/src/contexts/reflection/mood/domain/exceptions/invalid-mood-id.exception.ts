import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMoodIdException extends DomainException {
  constructor() {
    super('Mood ID cannot be empty', Errors.INVALID_MOOD_ID);
  }
}
