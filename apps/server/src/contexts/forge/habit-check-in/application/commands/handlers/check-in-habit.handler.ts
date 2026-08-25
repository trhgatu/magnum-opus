import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { HabitCheckIn } from '../../../domain/habit-check-in.aggregate';
import {
  HABIT_CHECK_IN_REPOSITORY,
  type HabitCheckInRepository,
} from '../../../domain/ports/habit-check-in.repository';
import { HabitCheckInContextService } from '../../services';
import { CheckInHabitCommand } from '../check-in-habit.command';

@CommandHandler(CheckInHabitCommand)
export class CheckInHabitHandler implements ICommandHandler<
  CheckInHabitCommand,
  Result<HabitCheckIn, DomainException>
> {
  constructor(
    @Inject(HABIT_CHECK_IN_REPOSITORY)
    private readonly repository: HabitCheckInRepository,
    private readonly context: HabitCheckInContextService,
  ) {}

  public async execute(
    command: CheckInHabitCommand,
  ): Promise<Result<HabitCheckIn, DomainException>> {
    const { date, now } = await this.context.currentDateForOwnedHabit(
      command.habitId,
      command.ownerId,
      true,
    );
    const checkIn = HabitCheckIn.create({
      habitId: command.habitId,
      ownerId: command.ownerId,
      date,
      createdAt: now,
    });

    return Result.ok(await this.repository.createIfAbsent(checkIn));
  }
}
