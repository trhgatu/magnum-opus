import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMoodIntensityException extends DomainException {
  constructor() {
    super(
      'Mood intensity must be an integer between 1 and 5',
      Errors.INVALID_MOOD_INTENSITY,
      {
        min: 1,
        max: 5,
      },
    );
  }
}
