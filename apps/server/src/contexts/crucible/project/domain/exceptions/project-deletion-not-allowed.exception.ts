import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class ProjectDeletionNotAllowedException extends DomainException {
  constructor(projectId: string) {
    super(
      `Project "${projectId}" cannot be deleted because it already has a Project Cycle`,
      Errors.PROJECT_DELETION_NOT_ALLOWED,
      { projectId },
    );
  }
}
