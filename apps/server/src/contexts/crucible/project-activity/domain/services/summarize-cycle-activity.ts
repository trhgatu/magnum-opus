import type { ActivityDayState } from '@repo/contracts';

import {
  type ActivityEvent,
  coversInstant,
  dataUntilOf,
  type SourceCoverage,
} from '../activity-evidence';
import {
  addDays,
  type CalendarDay,
  calendarDayAt,
  eachDayInclusive,
  startOfDay,
} from '../calendar-day';
import type { DeclarationTimeline } from '../declaration-timeline';
import { attributeEvent } from './attribute-event';

export interface CycleActivityMetrics {
  activeDays: number;
  pausedActiveDays: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
}

export interface CycleActivitySummary {
  metrics: CycleActivityMetrics;
  lastActivityAt: Date | null;
  days: { date: CalendarDay; state: ActivityDayState }[];
  /** Có ngày không có dữ liệu, hoặc có nguồn chưa phủ trọn Cycle. */
  hasMissingData: boolean;
  dataUntil: Date | null;
}

/**
 * Hoạt động của một Cycle theo ngày lịch trong múi giờ của tài khoản
 * (02 §3.3–3.4). `until` là thời điểm xét: bây giờ với Cycle đang mở, lúc
 * khép với snapshot.
 */
export function summarizeCycleActivity(input: {
  cycleId: string;
  timeline: DeclarationTimeline;
  events: readonly ActivityEvent[];
  sources: readonly SourceCoverage[];
  timeZone: string;
  until: Date;
}): CycleActivitySummary {
  const { cycleId, timeline, sources, timeZone, until } = input;
  const segments = timeline.segmentsOfCycle(cycleId);
  const cycleStart = segments[0]?.from;
  if (!cycleStart) throw new Error(`Cycle ${cycleId} is not on the timeline`);

  const cycleEnd = segments[segments.length - 1].to ?? until;
  const rangeEnd = new Date(Math.min(cycleEnd.getTime(), until.getTime()));

  // Event của Cycle, có nhãn; event ghi ngày tương lai (đồng hồ lệch) không tính.
  const labelled = input.events.flatMap((event) => {
    if (event.occurredAt.getTime() >= rangeEnd.getTime()) return [];
    const attribution = attributeEvent(event, timeline);
    return attribution.inCycle && attribution.cycleId === cycleId
      ? [{ event, label: attribution.label }]
      : [];
  });

  const labelsByDay = new Map<CalendarDay, Set<'ACTIVE' | 'PAUSED'>>();
  for (const { event, label } of labelled) {
    const day = calendarDayAt(event.occurredAt, timeZone);
    labelsByDay.set(day, (labelsByDay.get(day) ?? new Set()).add(label));
  }

  const pausedSegments = segments.filter(
    (segment) => segment.state === 'PAUSED',
  );
  const lastDay = calendarDayAt(
    new Date(Math.max(rangeEnd.getTime() - 1, cycleStart.getTime())),
    timeZone,
  );
  const days = eachDayInclusive(
    calendarDayAt(cycleStart, timeZone),
    lastDay,
  ).map((date) => {
    // Ngày đầu và ngày cuối bị cắt theo phạm vi Cycle.
    const dayStart = new Date(
      Math.max(startOfDay(date, timeZone).getTime(), cycleStart.getTime()),
    );
    const dayEnd = new Date(
      Math.min(
        startOfDay(addDays(date, 1), timeZone).getTime(),
        rangeEnd.getTime(),
      ),
    );
    return { date, state: dayState(date, dayStart, dayEnd) };
  });

  function dayState(
    date: CalendarDay,
    dayStart: Date,
    dayEnd: Date,
  ): ActivityDayState {
    // Không nguồn nào chép tới ngày này: không có dữ liệu, không phải IDLE.
    if (!sources.some((source) => coversInstant(source, dayStart))) {
      return 'NO_DATA';
    }
    const labels = labelsByDay.get(date);
    if (labels?.has('ACTIVE')) return 'ACTIVE';
    if (labels) return 'PAUSED_ACTIVE';

    const withinPause = pausedSegments.some(
      (segment) =>
        segment.from !== null &&
        segment.from.getTime() <= dayStart.getTime() &&
        (segment.to === null || dayEnd.getTime() <= segment.to.getTime()),
    );
    return withinPause ? 'PAUSED_IDLE' : 'IDLE';
  }

  const count = (kind: ActivityEvent['kind']) =>
    labelled.filter(({ event }) => event.kind === kind).length;
  const lastActivity = labelled.reduce<number | null>(
    (latest, { event }) =>
      Math.max(latest ?? -Infinity, event.occurredAt.getTime()),
    null,
  );

  return {
    metrics: {
      activeDays: days.filter(
        (day) => day.state === 'ACTIVE' || day.state === 'PAUSED_ACTIVE',
      ).length,
      pausedActiveDays: days.filter((day) => day.state === 'PAUSED_ACTIVE')
        .length,
      commits: count('COMMIT_AUTHORED'),
      prsOpened: count('PR_OPENED'),
      prsMerged: count('PR_MERGED'),
    },
    lastActivityAt: lastActivity === null ? null : new Date(lastActivity),
    days,
    hasMissingData:
      days.some((day) => day.state === 'NO_DATA') ||
      sources.some(
        (source) =>
          source.status !== 'ACTIVE' || !coversInstant(source, cycleStart),
      ),
    dataUntil: dataUntilOf(sources),
  };
}
