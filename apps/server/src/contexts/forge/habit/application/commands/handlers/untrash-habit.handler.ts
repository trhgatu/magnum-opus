import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { Habit } from '../../../domain/habit.aggregate';
import { HabitMutationService, HabitTodayService } from '../../services';
import { UntrashHabitCommand } from '../untrash-habit.command';

@CommandHandler(UntrashHabitCommand)
export class UntrashHabitHandler implements ICommandHandler<
  UntrashHabitCommand,
  Result<Habit, DomainException>
> {
  constructor(
    private readonly mutationService: HabitMutationService,
    private readonly todayService: HabitTodayService,
  ) {}

  public execute(
    command: UntrashHabitCommand,
  ): Promise<Result<Habit, DomainException>> {
    return this.mutationService.mutate({
      habitId: command.habitId,
      ownerId: command.ownerId,
      expectedRevision: command.expectedRevision,
      mutate: async (habit) => {
        habit.restoreFromTrash(
          await this.todayService.todayForOwner(command.ownerId),
        );
      },
    });
  }
}
