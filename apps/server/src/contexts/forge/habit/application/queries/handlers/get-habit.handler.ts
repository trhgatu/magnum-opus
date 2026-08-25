import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { HabitNotFoundException } from '../../../domain/exceptions';
import { Habit } from '../../../domain/habit.aggregate';
import {
  HABIT_REPOSITORY,
  type HabitRepository,
} from '../../../domain/ports/habit.repository';
import { GetHabitQuery } from '../get-habit.query';

@QueryHandler(GetHabitQuery)
export class GetHabitHandler implements IQueryHandler<
  GetHabitQuery,
  Result<Habit, DomainException>
> {
  constructor(
    @Inject(HABIT_REPOSITORY)
    private readonly habitRepository: HabitRepository,
  ) {}

  public async execute(
    query: GetHabitQuery,
  ): Promise<Result<Habit, DomainException>> {
    const habit = await this.habitRepository.findByIdForOwner(
      query.habitId,
      query.ownerId,
    );

    return habit
      ? Result.ok(habit)
      : Result.fail(new HabitNotFoundException(query.habitId));
  }
}
