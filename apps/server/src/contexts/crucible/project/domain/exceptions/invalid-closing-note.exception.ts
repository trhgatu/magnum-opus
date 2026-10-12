import { Errors } from '@repo/contracts';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

export type InvalidClosingNoteReason = 'too_long' | 'no_cycle';

const MESSAGES: Record<InvalidClosingNoteReason, string> = {
  too_long: 'Closing note must be ai most 2000 characters',
  no_cycle: 'A project that never started has no Cycle to attach a note to',
};

export class InvalidClosingNoteException extends DomainException {
  constructor(reason: InvalidClosingNoteReason) {
    super(MESSAGES[reason], Errors.INVALID_CLOSING_NOTE, { reason });
  }
}
