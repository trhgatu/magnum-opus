import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  HABIT_CHECK_IN_REPOSITORY,
  type HabitCheckInRepository,
} from '../../../domain/ports/habit-check-in.repository';
import { HabitCheckInContextService } from '../../services';
import { UndoHabitCheckInCommand } from '../undo-habit-check-in.command';

@CommandHandler(UndoHabitCheckInCommand)
export class UndoHabitCheckInHandler implements ICommandHandler<
  UndoHabitCheckInCommand,
  Result<void, DomainException>
> {
  constructor(
    @Inject(HABIT_CHECK_IN_REPOSITORY)
    private readonly repository: HabitCheckInRepository,
    private readonly context: HabitCheckInContextService,
  ) {}

  public async execute(
    command: UndoHabitCheckInCommand,
  ): Promise<Result<void, DomainException>> {
    const { date } = await this.context.currentDateForOwnedHabit(
      command.habitId,
      command.ownerId,
      false,
    );

    await this.repository.deleteByHabitAndDateForOwner(
      command.habitId,
      command.ownerId,
      date.value,
    );

    return Result.ok(undefined);
  }
}
