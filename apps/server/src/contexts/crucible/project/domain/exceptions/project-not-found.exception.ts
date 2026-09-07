import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class ProjectNotFoundException extends DomainException {
  constructor(projectId: string) {
    super(
      `Project with ID "${projectId}" was not found`,
      Errors.PROJECT_NOT_FOUND,
      { projectId },
    );
  }
}
