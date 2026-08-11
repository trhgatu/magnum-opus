import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidMoodNoteException extends DomainException {
  constructor() {
    super(
      'Mood note cannot contain more than 500 characters',
      Errors.INVALID_MOOD_NOTE,
      {
        maxLength: 500,
      },
    );
  }
}
