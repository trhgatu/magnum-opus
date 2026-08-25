import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Habit } from '../../../domain/habit.aggregate';
import { HabitFrequency } from '../../../domain/value-objects';
import { HabitMutationService } from '../../services';
import { UpdateHabitCommand } from '../update-habit.command';

@CommandHandler(UpdateHabitCommand)
export class UpdateHabitHandler implements ICommandHandler<
  UpdateHabitCommand,
  Result<Habit, DomainException>
> {
  constructor(private readonly mutationService: HabitMutationService) {}

  public execute(
    command: UpdateHabitCommand,
  ): Promise<Result<Habit, DomainException>> {
    return this.mutationService.mutate({
      habitId: command.habitId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (habit) =>
        habit.update({
          title: command.title,
          description: command.description,
          frequency: HabitFrequency.create(
            command.frequencyType,
            command.frequencyDays,
          ),
        }),
    });
  }
}
