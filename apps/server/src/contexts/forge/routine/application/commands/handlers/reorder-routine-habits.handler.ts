import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

import { Result } from '@shared/domain/result';
import { Routine } from '../../../domain/routine.aggregate';

import { RoutineMutationService } from '../../services';
import { ReorderRoutineHabitsCommand } from '../reorder-routine-habits.command';

@CommandHandler(ReorderRoutineHabitsCommand)
export class ReorderRoutineHabitsHandler implements ICommandHandler<
  ReorderRoutineHabitsCommand,
  Result<Routine, DomainException>
> {
  constructor(private readonly mutationService: RoutineMutationService) {}

  public async execute(
    command: ReorderRoutineHabitsCommand,
  ): Promise<Result<Routine, DomainException>> {
    return this.mutationService.mutate({
      routineId: command.routineId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (routine) => routine.reorderHabits(command.habitIds),
    });
  }
}
