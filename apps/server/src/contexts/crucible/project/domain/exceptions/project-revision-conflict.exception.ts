import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class ProjectRevisionConflictException extends DomainException {
  constructor(projectId: string, expectedRevision: number) {
    super(
      `Project "${projectId}" revision conflict (expected ${expectedRevision})`,
      Errors.PROJECT_REVISION_CONFLICT,
      { projectId, expectedRevision },
    );
  }
}
