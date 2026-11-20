import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { InvalidHabitTypeException } from '../../../domain/exceptions';
import { Habit } from '../../../domain/habit.aggregate';
import { HabitFrequency } from '../../../domain/value-objects';
import { HabitType } from '../../../domain';
import { HabitMutationService, HabitTodayService } from '../../services';
import { UpdateHabitCommand } from '../update-habit.command';

@CommandHandler(UpdateHabitCommand)
export class UpdateHabitHandler implements ICommandHandler<
  UpdateHabitCommand,
  Result<Habit, DomainException>
> {
  constructor(
    private readonly mutationService: HabitMutationService,
    private readonly todayService: HabitTodayService,
  ) {}

  public execute(
    command: UpdateHabitCommand,
  ): Promise<Result<Habit, DomainException>> {
    return this.mutationService.mutate({
      habitId: command.habitId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: async (habit) => {
        if (!command.frequencyType && command.frequencyDays.length > 0) {
          throw new InvalidHabitTypeException();
        }

        const frequency = command.frequencyType
          ? HabitFrequency.create(command.frequencyType, command.frequencyDays)
          : null;

        const today =
          habit.type === HabitType.QUIT || habit.changesFrequency(frequency)
            ? await this.todayService.todayForOwner(command.ownerId)
            : undefined;

        habit.update({
          title: command.title,
          description: command.description,
          frequency,
          quitStartedAt: command.quitStartedAt,
          today,
        });
      },
    });
  }
}
