import { type ErrorDefinition, Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

/** Cùng mã với module Project: Project không có hoặc không thuộc người dùng. */
export class ProjectNotFoundException extends DomainException {
  constructor(projectId: string) {
    super(
      `Project with ID "${projectId}" was not found`,
      Errors.PROJECT_NOT_FOUND,
      { projectId },
    );
  }
}

export class ActivitySourceNotFoundException extends DomainException {
  constructor(feedId: string) {
    super(
      `Activity source "${feedId}" is not linked to this project`,
      Errors.ACTIVITY_SOURCE_NOT_FOUND,
      { feedId },
    );
  }
}

/** Kết nối không cho gắn tài nguyên (chưa kết nối, mất quyền, bị giới hạn...). */
export class ActivitySourceUnavailableException extends DomainException {
  constructor(error: ErrorDefinition, args?: Record<string, unknown>) {
    super(`Activity source cannot be linked: ${error.code}`, error, args);
  }
}
