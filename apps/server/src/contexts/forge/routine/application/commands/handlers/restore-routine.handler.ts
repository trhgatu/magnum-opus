import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Routine } from '../../../domain/routine.aggregate';
import { RoutineMutationService, RoutineTodayService } from '../../services';
import { RestoreRoutineCommand } from '../restore-routine.command';

@CommandHandler(RestoreRoutineCommand)
export class RestoreRoutineHandler implements ICommandHandler<
  RestoreRoutineCommand,
  Result<Routine, DomainException>
> {
  constructor(
    private readonly mutationService: RoutineMutationService,
    private readonly todayService: RoutineTodayService,
  ) {}

  public async execute(
    command: RestoreRoutineCommand,
  ): Promise<Result<Routine, DomainException>> {
    const today = await this.todayService.todayForOwner(command.ownerId);

    return this.mutationService.mutate({
      routineId: command.routineId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (routine) => routine.restore(today),
    });
  }
}
