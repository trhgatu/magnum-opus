import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

import { Result } from '@shared/domain/result';
import { Routine } from '../../../domain/routine.aggregate';

import { RoutineMutationService } from '../../services';
import { MoveRoutineHabitUpCommand } from '../move-routine-habit-up.command';

@CommandHandler(MoveRoutineHabitUpCommand)
export class MoveRoutineHabitUpHandler implements ICommandHandler<
  MoveRoutineHabitUpCommand,
  Result<Routine, DomainException>
> {
  constructor(private readonly mutationService: RoutineMutationService) {}

  public async execute(
    command: MoveRoutineHabitUpCommand,
  ): Promise<Result<Routine, DomainException>> {
    return this.mutationService.mutate({
      routineId: command.routineId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (routine) => routine.moveHabitUp(command.habitId),
    });
  }
}
