import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Routine } from '../../../domain/routine.aggregate';
import { RoutineMutationService } from '../../services';
import { UpdateRoutineTitleCommand } from '../update-routine-title.command';

@CommandHandler(UpdateRoutineTitleCommand)
export class UpdateRoutineTitleHandler implements ICommandHandler<
  UpdateRoutineTitleCommand,
  Result<Routine, DomainException>
> {
  constructor(private readonly mutationService: RoutineMutationService) {}

  public execute(
    command: UpdateRoutineTitleCommand,
  ): Promise<Result<Routine, DomainException>> {
    return this.mutationService.mutate({
      routineId: command.routineId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (routine) => routine.updateTitle(command.title),
    });
  }
}
