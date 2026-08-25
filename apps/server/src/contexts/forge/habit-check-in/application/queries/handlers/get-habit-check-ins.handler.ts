import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { InvalidHabitCheckInRangeException } from '../../../domain/exceptions';
import { HabitCheckInDate } from '../../../domain/value-objects';
import {
  HABIT_CHECK_IN_READER,
  type HabitCheckInReadModel,
  type HabitCheckInReader,
} from '../../ports/habit-check-in-reader.port';
import { HabitCheckInContextService } from '../../services';
import { GetHabitCheckInsQuery } from '../get-habit-check-ins.query';

const MAX_RANGE_DAYS = 366;

@QueryHandler(GetHabitCheckInsQuery)
export class GetHabitCheckInsHandler implements IQueryHandler<
  GetHabitCheckInsQuery,
  Result<HabitCheckInReadModel[], DomainException>
> {
  constructor(
    @Inject(HABIT_CHECK_IN_READER)
    private readonly reader: HabitCheckInReader,
    private readonly context: HabitCheckInContextService,
  ) {}

  public async execute(
    query: GetHabitCheckInsQuery,
  ): Promise<Result<HabitCheckInReadModel[], DomainException>> {
    await this.context.ensureOwnedHabit(query.habitId, query.ownerId);
    const from = HabitCheckInDate.create(query.from);
    const to = HabitCheckInDate.create(query.to);
    const rangeDays =
      (to.toPersistenceDate().getTime() - from.toPersistenceDate().getTime()) /
        86_400_000 +
      1;

    if (rangeDays < 1 || rangeDays > MAX_RANGE_DAYS) {
      return Result.fail(
        new InvalidHabitCheckInRangeException(query.from, query.to),
      );
    }

    return Result.ok(
      await this.reader.findForHabitInRange(
        query.habitId,
        query.ownerId,
        from.value,
        to.value,
      ),
    );
  }
}
