import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { InvalidHabitTypeException } from '../../../domain/exceptions';
import { Habit } from '../../../domain/habit.aggregate';
import {
  HABIT_REPOSITORY,
  type HabitRepository,
} from '../../../domain/ports/habit.repository';
import { HabitFrequency } from '../../../domain/value-objects';
import { HabitTodayService } from '../../services';
import { CreateHabitCommand } from '../create-habit.command';

@CommandHandler(CreateHabitCommand)
export class CreateHabitHandler implements ICommandHandler<
  CreateHabitCommand,
  Result<Habit, DomainException>
> {
  constructor(
    @Inject(HABIT_REPOSITORY)
    private readonly habitRepository: HabitRepository,
    private readonly todayService: HabitTodayService,
  ) {}

  public async execute(
    command: CreateHabitCommand,
  ): Promise<Result<Habit, DomainException>> {
    if (!command.frequencyType && command.frequencyDays.length > 0) {
      throw new InvalidHabitTypeException();
    }

    const today = await this.todayService.todayForOwner(command.ownerId);
    const habit = Habit.create({
      ownerId: command.ownerId,
      title: command.title,
      description: command.description,
      type: command.type,
      frequency: command.frequencyType
        ? HabitFrequency.create(command.frequencyType, command.frequencyDays)
        : null,
      quitStartedAt: command.quitStartedAt,
      today,
    });

    await this.habitRepository.create(habit);

    return Result.ok(habit);
  }
}
