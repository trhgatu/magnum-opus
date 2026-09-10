import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  HabitNotFoundException,
  HabitRelapseForbiddenException,
} from '../../../domain/exceptions';
import { HabitRelapse } from '../../../domain/habit-relapse.aggregate';
import {
  HABIT_RELAPSE_REPOSITORY,
  type HabitRelapseRepository,
} from '../../../domain/ports/habit-relapse.repository';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  OWNED_HABIT_READER,
  type OwnedHabitReader,
} from '../../ports/owned-habit-reader.port';
import { LogRelapseCommand } from '../log-relapse.command';

@CommandHandler(LogRelapseCommand)
export class LogRelapseHandler implements ICommandHandler<
  LogRelapseCommand,
  Result<HabitRelapse, DomainException>
> {
  constructor(
    @Inject(HABIT_RELAPSE_REPOSITORY)
    private readonly repository: HabitRelapseRepository,
    @Inject(OWNED_HABIT_READER)
    private readonly habitReader: OwnedHabitReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async execute(
    command: LogRelapseCommand,
  ): Promise<Result<HabitRelapse, DomainException>> {
    const habit = await this.habitReader.findByIdForOwner(
      command.habitId,
      command.ownerId,
    );
    if (!habit) {
      return Result.fail(new HabitNotFoundException(command.habitId));
    }
    if (!habit.isActive || habit.type !== 'QUIT') {
      return Result.fail(new HabitRelapseForbiddenException(command.habitId));
    }

    const relapse = HabitRelapse.create({
      habitId: command.habitId,
      ownerId: command.ownerId,
      occurredAt: this.clock.now(),
      createdAt: this.clock.now(),
    });

    await this.repository.create(relapse);

    return Result.ok(relapse);
  }
}
