import { Errors } from '@repo/contracts';

import { DomainException } from '@shared/domain/exceptions/domain.exception';

export class RoutineNotFoundException extends DomainException {
  constructor(routineId: string) {
    super(
      `Routine with ID "${routineId}" was not found`,
      Errors.ROUTINE_NOT_FOUND,
      {
        routineId,
      },
    );
  }
}
