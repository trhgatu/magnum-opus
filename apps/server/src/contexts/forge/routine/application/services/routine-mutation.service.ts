import { Inject, Injectable } from '@nestjs/common';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  RoutineNotFoundException,
  RoutineRevisionConflictException,
} from '../../domain/exceptions';
import { Routine } from '../../domain/routine.aggregate';
import {
  ROUTINE_REPOSITORY,
  type RoutineRepository,
} from '../../domain/ports/routine.repository';

export interface RoutineMutationInput {
  routineId: string;
  ownerId: string;
  expectedRevision: number;
  // Chỉ chạy sau khi Routine đã được tìm thấy và đúng revision, nên phần cần
  // await bên trong (vd tính "hôm nay" của owner) không chạy cho Routine
  // không tồn tại.
  mutate: (routine: Routine) => void | Promise<void>;
}

@Injectable()
export class RoutineMutationService {
  constructor(
    @Inject(ROUTINE_REPOSITORY)
    private readonly routineRepository: RoutineRepository,
  ) {}

  public async mutate(
    input: RoutineMutationInput,
  ): Promise<Result<Routine, DomainException>> {
    const routine = await this.routineRepository.findByIdForOwner(
      input.routineId,
      input.ownerId,
    );

    if (!routine) {
      return Result.fail(new RoutineNotFoundException(input.routineId));
    }

    if (routine.revision !== input.expectedRevision) {
      return Result.fail(
        new RoutineRevisionConflictException(
          input.routineId,
          input.expectedRevision,
        ),
      );
    }

    try {
      await input.mutate(routine);
    } catch (error: unknown) {
      if (error instanceof DomainException) {
        return Result.fail(error);
      }

      throw error;
    }

    if (routine.revision === input.expectedRevision) {
      return Result.ok(routine);
    }

    const updated = await this.routineRepository.update(
      routine,
      input.expectedRevision,
    );

    return updated
      ? Result.ok(routine)
      : Result.fail(
          new RoutineRevisionConflictException(
            input.routineId,
            input.expectedRevision,
          ),
        );
  }
}
