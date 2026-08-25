import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  HABIT_CHECK_IN_READER,
  type HabitCheckInReadModel,
  type HabitCheckInReader,
} from '../../ports/habit-check-in-reader.port';
import { HabitCheckInContextService } from '../../services';
import { GetHabitCheckInTodayQuery } from '../get-habit-check-in-today.query';

export interface HabitCheckInTodayResult {
  date: string;
  checkIn: HabitCheckInReadModel | null;
}

@QueryHandler(GetHabitCheckInTodayQuery)
export class GetHabitCheckInTodayHandler implements IQueryHandler<
  GetHabitCheckInTodayQuery,
  Result<HabitCheckInTodayResult, DomainException>
> {
  constructor(
    @Inject(HABIT_CHECK_IN_READER)
    private readonly reader: HabitCheckInReader,
    private readonly context: HabitCheckInContextService,
  ) {}

  public async execute(
    query: GetHabitCheckInTodayQuery,
  ): Promise<Result<HabitCheckInTodayResult, DomainException>> {
    const { date } = await this.context.currentDateForOwnedHabit(
      query.habitId,
      query.ownerId,
      false,
    );
    const checkIn = await this.reader.findForHabitOnDate(
      query.habitId,
      query.ownerId,
      date.value,
    );

    return Result.ok({ date: date.value, checkIn });
  }
}
