import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class InvalidRoutineTitleException extends DomainException {
  constructor() {
    super(
      'Routine title must not be empty or longer than 200 characters',
      Errors.INVALID_ROUTINE_TITLE,
    );
  }
}
