import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain';

import {
  RoutineHabitInactiveException,
  RoutineHabitReferenceNotFoundException,
} from '../../../domain/exceptions';
import { Routine } from '../../../domain/routine.aggregate';
import {
  ROUTINE_HABIT_READER,
  type RoutineHabitReader,
} from '../../ports/routine-habit-reader.port';
import { RoutineMutationService } from '../../services';
import { AddRoutineHabitCommand } from '../add-routine-habit.command';

@CommandHandler(AddRoutineHabitCommand)
export class AddRoutineHabitHandler implements ICommandHandler<
  AddRoutineHabitCommand,
  Result<Routine, DomainException>
> {
  constructor(
    @Inject(ROUTINE_HABIT_READER)
    private readonly routineHabitReader: RoutineHabitReader,
    private readonly mutationService: RoutineMutationService,
  ) {}

  public async execute(
    command: AddRoutineHabitCommand,
  ): Promise<Result<Routine, DomainException>> {
    const habit = await this.routineHabitReader.findByIdForOwner(
      command.habitId,
      command.ownerId,
    );

    if (!habit) {
      return Result.fail(
        new RoutineHabitReferenceNotFoundException(command.habitId),
      );
    }

    if (!habit.isActive) {
      return Result.fail(new RoutineHabitInactiveException(command.habitId));
    }

    return this.mutationService.mutate({
      routineId: command.routineId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (routine) => routine.addHabit(command.habitId),
    });
  }
}
