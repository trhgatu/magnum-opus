import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DomainException } from '@shared/domain/exceptions/domain.exception';

import { Result } from '@shared/domain/result';
import { Routine } from '../../../domain/routine.aggregate';

import { RoutineMutationService } from '../../services';
import { MoveRoutineHabitDownCommand } from '../move-routine-habit-down.command';

@CommandHandler(MoveRoutineHabitDownCommand)
export class MoveRoutineHabitDownHandler implements ICommandHandler<
  MoveRoutineHabitDownCommand,
  Result<Routine, DomainException>
> {
  constructor(private readonly mutationService: RoutineMutationService) {}

  public async execute(
    command: MoveRoutineHabitDownCommand,
  ): Promise<Result<Routine, DomainException>> {
    return this.mutationService.mutate({
      routineId: command.routineId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (routine) => routine.moveHabitDown(command.habitId),
    });
  }
}
