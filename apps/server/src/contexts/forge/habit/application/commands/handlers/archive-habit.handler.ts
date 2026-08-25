import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Habit } from '../../../domain/habit.aggregate';
import { HabitMutationService } from '../../services';
import { ArchiveHabitCommand } from '../archive-habit.command';

@CommandHandler(ArchiveHabitCommand)
export class ArchiveHabitHandler implements ICommandHandler<
  ArchiveHabitCommand,
  Result<Habit, DomainException>
> {
  constructor(private readonly mutationService: HabitMutationService) {}

  public execute(
    command: ArchiveHabitCommand,
  ): Promise<Result<Habit, DomainException>> {
    return this.mutationService.mutate({
      habitId: command.habitId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: (habit) => habit.archive(),
    });
  }
}
