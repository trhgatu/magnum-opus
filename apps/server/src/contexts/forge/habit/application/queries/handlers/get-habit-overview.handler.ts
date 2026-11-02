import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { type CalendarDay, calendarDayAt } from '@shared/domain/calendar-day';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  type HabitOverview,
  summarizeHabitOverview,
} from '../../../domain/services/habit-overview';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  HABIT_OVERVIEW_READER,
  type HabitOverviewReader,
  type HabitOverviewRow,
} from '../../ports/habit-overview-reader.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../../ports/user-time-zone-reader.port';
import { GetHabitOverviewQuery } from '../get-habit-overview.query';

export interface HabitOverviewItem {
  habit: HabitOverviewRow;
  overview: HabitOverview;
  checkedInAt: Date | null;
}

export interface HabitOverviewResult {
  date: CalendarDay;
  timeZone: string;
  items: HabitOverviewItem[];
}

@QueryHandler(GetHabitOverviewQuery)
export class GetHabitOverviewHandler implements IQueryHandler<
  GetHabitOverviewQuery,
  Result<HabitOverviewResult, DomainException>
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
    query: GetHabitOverviewQuery,
  ): Promise<Result<HabitOverviewResult, DomainException>> {
    const timeZone = await this.timeZoneReader.getForUser(query.ownerId);
    const today = calendarDayAt(this.clock.now(), timeZone);
    const habits = await this.reader.findActiveForOwner(
      query.ownerId,
      timeZone,
    );

    return Result.ok({
      date: today,
      timeZone,
      items: habits.map((habit) => ({
        habit,
        overview: summarizeHabitOverview(habit, today),
        checkedInAt: habit.checkInAt.get(today) ?? null,
      })),
    });
  }
}
