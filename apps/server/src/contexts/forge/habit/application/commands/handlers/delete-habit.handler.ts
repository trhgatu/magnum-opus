import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { HabitState } from '../../../domain/enums';
import {
  HabitNotFoundException,
  HabitPermanentDeleteForbiddenException,
  HabitRevisionConflictException,
} from '../../../domain/exceptions';
import {
  HABIT_REPOSITORY,
  type HabitRepository,
} from '../../../domain/ports/habit.repository';
import { DeleteHabitCommand } from '../delete-habit.command';

@CommandHandler(DeleteHabitCommand)
export class DeleteHabitHandler implements ICommandHandler<
  DeleteHabitCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(HABIT_REPOSITORY)
    private readonly habitRepository: HabitRepository,
  ) {}

  public async execute(
    command: DeleteHabitCommand,
  ): Promise<Result<void, DomainException>> {
    const habit = await this.habitRepository.findByIdForOwner(
      command.habitId,
      command.ownerId,
    );

    if (!habit) {
      return Result.fail(new HabitNotFoundException(command.habitId));
    }
    if (habit.revision !== command.expectedRevision) {
      return Result.fail(
        new HabitRevisionConflictException(
          command.habitId,
          command.expectedRevision,
        ),
      );
    }
    if (habit.state !== HabitState.TRASHED) {
      return Result.fail(
        new HabitPermanentDeleteForbiddenException(command.habitId),
      );
    }

    const deleted = await this.habitRepository.deletePermanently(
      command.habitId,
      command.ownerId,
      command.expectedRevision,
    );

    if (!deleted) {
      return Result.fail(
        new HabitRevisionConflictException(
          command.habitId,
          command.expectedRevision,
        ),
      );
    }

    return Result.ok(undefined);
  }
}
