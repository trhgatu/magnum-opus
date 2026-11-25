import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { calendarDayAt, type CalendarDay } from '@shared/domain/calendar-day';

import type {
  GardenSubjectKind,
  GardenVariant,
} from '../../../domain/garden-subject';

import {
  type GardenDatePrecision,
  lanternPlacedOn,
} from '../../../domain/garden-lantern';

import {
  type GardenWeek,
  gardenWeeks,
  weedsAfter,
} from '../../../domain/garden-week';
import { gardenLight } from '../../../domain/garden-light';
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

export interface GardenLantern {
  id: string;
  memoryId: string;
  occurredOn: CalendarDay | null;
  precision: GardenDatePrecision;
  /** Chỗ trên lối; null là chùm đèn chưa rõ ngày ở đầu lối. */
  placedOn: CalendarDay | null;
}

export interface GardenResult {
  today: CalendarDay;
  trees: GardenTree[];
  light: number;
  lanterns: GardenLantern[];
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
    // Mọi lần đọc chung một Promise.all: một lần lỗi không để lần khác bị bỏ
    // rơi (unhandled rejection làm sập process).
    const now = this.clock.now();
    const timeZonePromise = this.timeZoneReader.getForUser(query.ownerId);
    const [subjects, lanterns, today, lastReflectedOn] = await Promise.all([
      this.ledger.visibleSubjectsOf(query.ownerId),
      this.ledger.visibleLanternsOf(query.ownerId),
      timeZonePromise.then((timeZone) => calendarDayAt(now, timeZone)),
      timeZonePromise.then((timeZone) =>
        this.ledger.lastReflectedOn(
          query.ownerId,
          calendarDayAt(now, timeZone),
        ),
      ),
    ]);

    return {
      today,
      light: gardenLight(lastReflectedOn, today),
      lanterns: lanterns.map((lantern) => ({
        ...lantern,
        placedOn: lanternPlacedOn(lantern.occurredOn, lantern.precision),
      })),
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
