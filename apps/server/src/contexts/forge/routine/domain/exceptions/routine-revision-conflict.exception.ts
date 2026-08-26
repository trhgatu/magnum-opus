import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RoutineRevisionConflictException extends DomainException {
  constructor(routineId: string, expectedRevision: number) {
    super(
      `Routine "${routineId}" changed after revision ${expectedRevision}`,
      Errors.ROUTINE_REVISION_CONFLICT,
      {
        routineId,
        expectedRevision,
      },
    );
  }
}
