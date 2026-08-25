import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Habit } from '../../../domain/habit.aggregate';
import { HabitMutationService } from '../../services';
import { RestoreHabitCommand } from '../restore-habit.command';

@CommandHandler(RestoreHabitCommand)
export class RestoreHabitHandler implements ICommandHandler<
  RestoreHabitCommand,
  Result<Habit, DomainException>
> {
  constructor(private readonly mutationService: HabitMutationService) {}

  public execute(
    command: RestoreHabitCommand,
  ): Promise<Result<Habit, DomainException>> {
    return this.mutationService.mutate({
      habitId: command.habitId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (habit) => habit.restore(),
    });
  }
}
