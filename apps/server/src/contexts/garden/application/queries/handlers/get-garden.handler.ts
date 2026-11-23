import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { calendarDayAt, type CalendarDay } from '@shared/domain/calendar-day';

import type {
  GardenSubjectKind,
  GardenVariant,
} from '../../../domain/garden-subject';
import {
  type GardenWeek,
  gardenWeeks,
  weedsAfter,
} from '../../../domain/garden-week';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  GARDEN_LEDGER_READER,
  type GardenLedgerReader,
} from '../../ports/garden-ledger-reader.port';
import {
  USER_TIME_ZONE_READER,
  type UserTimeZoneReader,
} from '../../ports/user-time-zone-reader.port';
import { GetGardenQuery } from '../get-garden.query';

export interface GardenTree {
  id: string;
  subjectKind: GardenSubjectKind;
  subjectId: string;
  variant: GardenVariant;
  name: string;
  nameAtPlanting: string;
  bed: { id: string; name: string } | null;
  simVersion: number;
  plantedOn: CalendarDay;
  weeks: GardenWeek[];
  weeds: number;
}

export interface GardenResult {
  today: CalendarDay;
  trees: GardenTree[];
}

/** Vườn của owner: mỗi cây là chuỗi tuần tính lại từ sổ (BA §7). */
@QueryHandler(GetGardenQuery)
export class GetGardenHandler implements IQueryHandler<
  GetGardenQuery,
  GardenResult
> {
  constructor(
    @Inject(GARDEN_LEDGER_READER)
    private readonly ledger: GardenLedgerReader,
    @Inject(USER_TIME_ZONE_READER)
    private readonly timeZoneReader: UserTimeZoneReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async execute(query: GetGardenQuery): Promise<GardenResult> {
    const [subjects, timeZone] = await Promise.all([
      this.ledger.visibleSubjectsOf(query.ownerId),
      this.timeZoneReader.getForUser(query.ownerId),
    ]);
    const today = calendarDayAt(this.clock.now(), timeZone);

    return {
      today,
      trees: subjects.map(({ entries, ...subject }) => {
        const weeks = gardenWeeks({
          variant: subject.variant,
          plantedOn: subject.plantedOn,
          today,
          entries,
        });
        return { ...subject, weeks, weeds: weedsAfter(weeks) };
      }),
    };
  }
}
