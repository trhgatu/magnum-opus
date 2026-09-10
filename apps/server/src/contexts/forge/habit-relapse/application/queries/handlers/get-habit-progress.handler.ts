import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  HabitNotFoundException,
  HabitProgressNotApplicableException,
} from '../../../domain/exceptions';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  HABIT_PROGRESS_READER,
  type HabitProgressReader,
  type HabitProgressSinceReason,
} from '../../ports/habit-progress-reader.port';
import {
  OWNED_HABIT_READER,
  type OwnedHabitReader,
} from '../../ports/owned-habit-reader.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../../ports/user-time-zone-reader.port';
import { GetHabitProgressQuery } from '../get-habit-progress.query';

export interface HabitProgressResult {
  habitId: string;
  since: string;
  sinceReason: HabitProgressSinceReason;
  daysSince: number;
}

@QueryHandler(GetHabitProgressQuery)
export class GetHabitProgressHandler implements IQueryHandler<
  GetHabitProgressQuery,
  Result<HabitProgressResult, DomainException>
> {
  constructor(
    @Inject(OWNED_HABIT_READER)
    private readonly habitReader: OwnedHabitReader,
    @Inject(HABIT_PROGRESS_READER)
    private readonly progressReader: HabitProgressReader,
    @Inject(USER_TIME_ZONE_READER)
    private readonly timeZoneReader: UserTimeZoneReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async execute(
    query: GetHabitProgressQuery,
  ): Promise<Result<HabitProgressResult, DomainException>> {
    const habit = await this.habitReader.findByIdForOwner(
      query.habitId,
      query.ownerId,
    );
    if (!habit) {
      return Result.fail(new HabitNotFoundException(query.habitId));
    }
    if (habit.type !== 'QUIT') {
      return Result.fail(
        new HabitProgressNotApplicableException(query.habitId),
      );
    }

    const progress = await this.progressReader.getProgressFor(
      query.habitId,
      query.ownerId,
    );
    const timeZone = await this.timeZoneReader.getForUser(query.ownerId);

    const sinceDateKey =
      progress.sinceReason === 'RELAPSE'
        ? toCalendarDateKey(progress.sinceDate, timeZone)
        : progress.sinceDate.toISOString().slice(0, 10);
    const todayKey = toCalendarDateKey(this.clock.now(), timeZone);
    const daysSince = Math.round(
      (toUtcMidnight(todayKey).getTime() -
        toUtcMidnight(sinceDateKey).getTime()) /
        86_400_000,
    );

    return Result.ok({
      habitId: query.habitId,
      since: sinceDateKey,
      sinceReason: progress.sinceReason,
      daysSince,
    });
  }
}

function toCalendarDateKey(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

function toUtcMidnight(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}
