import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { type CalendarDay, calendarDayAt } from '@shared/domain/calendar-day';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { HabitNotFoundException } from '../../../domain';
import {
  summarizeHabitOverview,
  traceHabitDays,
  type HabitDayTrace,
} from '../../../domain/services/habit-overview';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  HABIT_OVERVIEW_READER,
  type HabitOverviewReader,
} from '../../ports/habit-overview-reader.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../../ports/user-time-zone-reader.port';
import { GetHabitOverviewItemQuery } from '../get-habit-overview-item.query';
import type { HabitOverviewItem } from './get-habit-overview.handler';
import { toHabitOverviewItem } from './get-habit-overview.handler';
const TRACE_DAYS = 91;

export interface HabitOverviewItemResult {
  date: CalendarDay;
  timeZone: string;
  item: HabitOverviewItem;
  trace: HabitDayTrace;
}

@QueryHandler(GetHabitOverviewItemQuery)
export class GetHabitOverviewItemHandler implements IQueryHandler<
  GetHabitOverviewItemQuery,
  Result<HabitOverviewItemResult, DomainException>
> {
  constructor(
    @Inject(HABIT_OVERVIEW_READER)
    private readonly reader: HabitOverviewReader,
    @Inject(USER_TIME_ZONE_READER)
    private readonly timeZoneReader: UserTimeZoneReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async execute(
    query: GetHabitOverviewItemQuery,
  ): Promise<Result<HabitOverviewItemResult, DomainException>> {
    const timeZone = await this.timeZoneReader.getForUser(query.ownerId);
    const today = calendarDayAt(this.clock.now(), timeZone);
    const habit = await this.reader.findOneForOwner(
      query.ownerId,
      query.habitId,
      timeZone,
    );

    if (!habit) {
      return Result.fail(new HabitNotFoundException(query.habitId));
    }

    return Result.ok({
      date: today,
      timeZone,
      item: toHabitOverviewItem(habit, today),

      trace: traceHabitDays(habit, today, TRACE_DAYS),
    });
  }
}
