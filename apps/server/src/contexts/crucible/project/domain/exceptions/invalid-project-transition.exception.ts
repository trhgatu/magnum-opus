import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ProjectLifecycleState } from '../enums';

export class InvalidProjectTransitionException extends DomainException {
  constructor(currentState: ProjectLifecycleState, action: string) {
    super(
      `Cannot ${action} a Project in state ${currentState}`,
      Errors.INVALID_PROJECT_TRANSITION,
      { currentState, action },
    );
  }
}
