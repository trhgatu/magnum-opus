import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class ProjectCycleNotFoundException extends DomainException {
  constructor(projectId: string) {
    super(
      `Project "${projectId}" has no current Project Cycle`,
      Errors.PROJECT_CYCLE_NOT_FOUND,
      { projectId },
    );
  }
}
