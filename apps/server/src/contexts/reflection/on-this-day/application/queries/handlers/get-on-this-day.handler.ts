import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { CalendarDay, calendarDayAt } from '@shared/domain/calendar-day';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import {
  ON_THIS_DAY_READER,
  type OnThisDayReader,
} from '../../ports/on-this-day-reader.port';
import {
  onThisDayMonthDays,
  toOnThisDayItems,
  type OnThisDayItem,
} from '../../services/on-this-day';
import { GetOnThisDayQuery } from '../get-on-this-day.query';

export interface OnThisDay {
  date: CalendarDay;
  items: OnThisDayItem[];
}

@QueryHandler(GetOnThisDayQuery)
export class GetOnThisDayHandler implements IQueryHandler<
  GetOnThisDayQuery,
  Result<OnThisDay, DomainException>
> {
  constructor(
    @Inject(ON_THIS_DAY_READER)
    private readonly reader: OnThisDayReader,
  ) {}

  public async execute(
    query: GetOnThisDayQuery,
  ): Promise<Result<OnThisDay, DomainException>> {
    const timeZone = await this.reader.getTimeZone(query.ownerId);
    const today = calendarDayAt(query.now, timeZone);
    const monthDays = onThisDayMonthDays(today);
    const year = Number(today.slice(0, 4));

    const [memories, journalEntries] = await Promise.all([
      this.reader.findMemories(query.ownerId, monthDays, year),
      this.reader.findJournalEntries(query.ownerId, monthDays, year, timeZone),
    ]);

    return Result.ok({
      date: today,
      items: toOnThisDayItems(today, memories, journalEntries),
    });
  }
}
