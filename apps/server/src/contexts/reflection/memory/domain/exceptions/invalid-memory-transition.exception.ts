import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

import { MemoryState } from '../enums';

export class InvalidMemoryTransitionException extends DomainException {
  constructor(currentState: MemoryState, targetState: MemoryState) {
    super(
      `Memory cannot transition from ${currentState} to ${targetState}`,
      Errors.INVALID_MEMORY_TRANSITION,
      {
        currentState,
        targetState,
      },
    );
  }
}
