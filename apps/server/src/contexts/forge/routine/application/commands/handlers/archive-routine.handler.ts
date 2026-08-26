import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Routine } from '../../../domain/routine.aggregate';
import { RoutineMutationService } from '../../services';
import { ArchiveRoutineCommand } from '../archive-routine.command';

@CommandHandler(ArchiveRoutineCommand)
export class ArchiveRoutineHandler implements ICommandHandler<
  ArchiveRoutineCommand,
  Result<Routine, DomainException>
> {
  constructor(private readonly mutationService: RoutineMutationService) {}

  public execute(
    command: ArchiveRoutineCommand,
  ): Promise<Result<Routine, DomainException>> {
    return this.mutationService.mutate({
      routineId: command.routineId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (routine) => routine.archive(),
    });
  }
}
