import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Habit } from '../../../domain/habit.aggregate';
import {
  HABIT_REPOSITORY,
  type HabitRepository,
} from '../../../domain/ports/habit.repository';
import { HabitFrequency } from '../../../domain/value-objects';
import { CreateHabitCommand } from '../create-habit.command';

@CommandHandler(CreateHabitCommand)
export class CreateHabitHandler implements ICommandHandler<
  CreateHabitCommand,
  Result<Habit, DomainException>
> {
  constructor(
    @Inject(HABIT_REPOSITORY)
    private readonly habitRepository: HabitRepository,
  ) {}

  public async execute(
    command: CreateHabitCommand,
  ): Promise<Result<Habit, DomainException>> {
    const habit = Habit.create({
      ownerId: command.ownerId,
      title: command.title,
      description: command.description,
      frequency: HabitFrequency.create(
        command.frequencyType,
        command.frequencyDays,
      ),
    });

    await this.habitRepository.create(habit);

    return Result.ok(habit);
  }
}
