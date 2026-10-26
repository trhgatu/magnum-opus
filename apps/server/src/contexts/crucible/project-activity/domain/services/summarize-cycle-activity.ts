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
  existsIn,
  startOfDay,
} from '../calendar-day';
import {
  clipIntervals,
  CODING_DAY_THRESHOLD_MS,
  codingIntervals,
  isPointEvent,
  latestEnd,
  splitAtBoundaries,
} from '../coding-time';
import type { DeclarationTimeline } from '../declaration-timeline';
import { attributeEvent } from './attribute-event';

export interface CycleActivityMetrics {
  activeDays: number;
  pausedActiveDays: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  codingSeconds: number | null;
}

export interface CycleActivityDay {
  date: CalendarDay;
  state: ActivityDayState;
  /** Giây code trong ngày; null theo cùng quy tắc với metrics. */
  codingSeconds: number | null;
}

export interface CycleActivitySummary {
  metrics: CycleActivityMetrics;
  lastActivityAt: Date | null;
  days: CycleActivityDay[];
  /** Có ngày không có dữ liệu, hoặc có nguồn chưa phủ trọn Cycle. */
  hasMissingData: boolean;
  dataUntil: Date | null;
}

const toSeconds = (ms: number) => Math.floor(ms / 1000);

/**
 * Hoạt động của một Cycle theo ngày lịch trong múi giờ của tài khoản
 * (02 §3.3–3.4, 08 §4.4–4.7). `until` là thời điểm xét: bây giờ với Cycle
 * đang mở, lúc khép với snapshot.
 */
export function summarizeCycleActivity(input: {
  cycleId: string;
  timeline: DeclarationTimeline;
  events: readonly ActivityEvent[];
  sources: readonly SourceCoverage[];
  timeZone: string;
  until: Date;
  /** Project có nguồn đo thời gian code. Mặc định không. */
  codingMeasured?: boolean;
}): CycleActivitySummary {
  const { cycleId, timeline, sources, timeZone, until } = input;
  const segments = timeline.segmentsOfCycle(cycleId);
  const cycleStart = segments[0]?.from;
  if (!cycleStart) throw new Error(`Cycle ${cycleId} is not on the timeline`);

  const closedAt = segments[segments.length - 1].to;
  const cycleEnd = closedAt ?? until;
  const rangeEnd = new Date(Math.min(cycleEnd.getTime(), until.getTime()));

  // Event có thời điểm của Cycle, có nhãn; event ghi ngày tương lai (đồng hồ
  // lệch) không tính.
  const labelled = input.events.filter(isPointEvent).flatMap((event) => {
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

  // Thời gian code trong phạm vi Cycle, đã hợp và cắt theo ngày và lời
  // tuyên bố — phần lúc tạm dừng vẫn thuộc Cycle (DEC-PAC-004).
  const codingPieces = splitAtBoundaries(
    clipIntervals(
      codingIntervals(input.events),
      cycleStart.getTime(),
      rangeEnd.getTime(),
    ),
    timeline,
    timeZone,
  ).filter((piece) => piece.segment.cycleId === cycleId);
  const codingByDay = new Map<CalendarDay, { active: number; total: number }>();
  for (const piece of codingPieces) {
    const ms = piece.end - piece.start;
    const day = codingByDay.get(piece.day) ?? { active: 0, total: 0 };
    day.total += ms;
    if (piece.segment.state === 'ACTIVE') day.active += ms;
    codingByDay.set(piece.day, day);
  }

  const pausedSegments = segments.filter(
    (segment) => segment.state === 'PAUSED',
  );
  const lastDay = calendarDayAt(
    new Date(Math.max(rangeEnd.getTime() - 1, cycleStart.getTime())),
    timeZone,
  );
  const days = eachDayInclusive(calendarDayAt(cycleStart, timeZone), lastDay)
    // Ngày múi giờ bỏ qua (đổi đường đổi ngày) không có trong dải ngày.
    .filter((date) => existsIn(date, timeZone))
    .map((date) => {
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
      return {
        date,
        state: dayState(date, dayStart, dayEnd),
        codingSeconds: input.codingMeasured
          ? toSeconds(codingByDay.get(date)?.total ?? 0)
          : null,
      };
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
    const coding = codingByDay.get(date);
    // Một event, hoặc từ 15 phút code (BR-PAC-041).
    const hasActivity =
      labels !== undefined || (coding?.total ?? 0) >= CODING_DAY_THRESHOLD_MS;
    if (hasActivity) {
      return labels?.has('ACTIVE') || (coding?.active ?? 0) > 0
        ? 'ACTIVE'
        : 'PAUSED_ACTIVE';
    }

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
  // Hoạt động gần nhất: event muộn nhất, hoặc lúc kết thúc đoạn code muộn nhất.
  const lastActivity = labelled.reduce(
    (latest, { event }) => Math.max(latest, event.occurredAt.getTime()),
    latestEnd(codingPieces) ?? -Infinity,
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
      codingSeconds: input.codingMeasured
        ? days.reduce((sum, day) => sum + (day.codingSeconds ?? 0), 0)
        : null,
    },
    lastActivityAt: Number.isFinite(lastActivity)
      ? new Date(lastActivity)
      : null,
    days,
    hasMissingData:
      days.some((day) => day.state === 'NO_DATA') ||
      sources.some(
        (source) =>
          source.status !== 'ACTIVE' ||
          !coversInstant(source, cycleStart) ||
          // Cycle đã khép: phải chép tới lúc khép. Cycle đang mở thì mốc chép
          // luôn trễ vài phút so với bây giờ — độ tươi do dataUntil báo.
          (closedAt !== null &&
            closedAt.getTime() <= until.getTime() &&
            (source.syncedUntil?.getTime() ?? 0) < closedAt.getTime()),
      ),
    dataUntil: dataUntilOf(sources),
  };
}
