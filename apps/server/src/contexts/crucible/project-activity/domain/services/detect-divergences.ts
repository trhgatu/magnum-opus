import {
  type ActivityEvent,
  dataUntilOf,
  type LinkedSource,
} from '../activity-evidence';
import { calendarDayAt } from '../calendar-day';
import {
  clipIntervals,
  CODING_DAY_THRESHOLD_MS,
  codingIntervals,
  type Interval,
  isPointEvent,
  latestEnd,
  msByDay,
  splitAtBoundaries,
  totalMs,
} from '../coding-time';
import type { DeclarationTimeline } from '../declaration-timeline';
import { attributeEvent } from './attribute-event';

/** Ngưỡng ban đầu — tham số hiệu chỉnh (OQ-PAC-002), không phải logic. */
export const D1_IDLE_DAYS = 7;
export const D2_ACTIVE_DAYS = 2;

const DAY_MS = 86_400_000;

export type Divergence =
  | { kind: 'ACTIVE_WITHOUT_ACTIVITY'; idleDays: number }
  | { kind: 'PAUSED_WITH_ACTIVITY'; activeDays: number }
  | {
      kind: 'ACTIVITY_AFTER_CLOSE';
      closedAs: 'STOPPED' | 'COMPLETED';
      commits: number;
      otherEvents: number;
      /** null: Project không đo thời gian code (BR-PAC-042). */
      codingSeconds: number | null;
      lastActivityAt: Date;
    }
  | { kind: 'ACTIVITY_BEFORE_START'; lastActivityAt: Date };

interface Evidence {
  /** Event có thời điểm (commit, PR) của nguồn đang gắn. */
  events: ActivityEvent[];
  /** Thời gian code của nguồn đang gắn, đã hợp và cắt tới `now`. */
  coding: Interval[];
}

/**
 * Chỗ lệch giữa lời tuyên bố hiện tại và hoạt động (02 §4, BR-PAC-022…025,
 * 08 §4.8). Chỉ chỉ ra — không bao giờ đổi trạng thái. Tối đa một mục mỗi
 * loại.
 */
export function detectDivergences(input: {
  timeline: DeclarationTimeline;
  events: readonly ActivityEvent[];
  sources: readonly LinkedSource[];
  timeZone: string;
  now: Date;
  /** Project có nguồn đo thời gian code. Mặc định không. */
  codingMeasured?: boolean;
}): Divergence[] {
  const { timeline, sources, timeZone, now } = input;
  // Không có nguồn thì không có bằng chứng để đặt cạnh lời tuyên bố.
  if (sources.length === 0) return [];

  const linkedFeeds = new Set(sources.map((source) => source.feedId));
  const linked = input.events.filter((event) => linkedFeeds.has(event.feedId));
  const evidence: Evidence = {
    // Event ghi ngày tương lai không tính.
    events: linked.filter(
      (event) =>
        isPointEvent(event) && event.occurredAt.getTime() <= now.getTime(),
    ),
    coding: clipIntervals(codingIntervals(linked), -Infinity, now.getTime()),
  };

  const divergence = (() => {
    switch (timeline.currentState) {
      case 'ACTIVE':
        return activeWithoutActivity(timeline, evidence, sources, timeZone);
      case 'PAUSED':
        return pausedWithActivity(timeline, evidence, timeZone);
      case 'STOPPED':
      case 'COMPLETED':
        return activityAfterClose(
          timeline,
          evidence,
          input.codingMeasured ?? false,
        );
      case 'NOT_STARTED':
        return activityBeforeStart(linked, evidence, sources, now);
    }
  })();
  return divergence ? [divergence] : [];
}

/** D1: tuyên bố đang làm nhưng N ngày không có hoạt động. */
function activeWithoutActivity(
  timeline: DeclarationTimeline,
  { events, coding }: Evidence,
  sources: readonly LinkedSource[],
  timeZone: string,
): Divergence | null {
  // Sự vắng mặt chỉ có nghĩa khi đọc được nguồn (6.8, RP-PAC-002).
  if (sources.some((source) => source.status !== 'ACTIVE')) return null;

  const activeSince = timeline.lastEntryInto(['ACTIVE']);
  const cycleId = timeline.currentCycleId;
  if (!activeSince || !cycleId) return null;

  // Mốc: muộn hơn giữa hoạt động gần nhất của Cycle và lần vào ACTIVE gần
  // nhất — vừa Start/Resume xong không bị nhắc ngay.
  let reference = activeSince.getTime();
  for (const event of events) {
    const attribution = attributeEvent(event, timeline);
    if (attribution.inCycle && attribution.cycleId === cycleId) {
      reference = Math.max(reference, event.occurredAt.getTime());
    }
  }
  // Code chỉ tính ở ngày đủ ngưỡng: mở editor vài phút không phải "đã làm".
  const pieces = splitAtBoundaries(coding, timeline, timeZone).filter(
    (piece) => piece.segment.cycleId === cycleId,
  );
  const perDay = msByDay(pieces);
  reference = Math.max(
    reference,
    latestEnd(
      pieces.filter(
        (piece) => (perDay.get(piece.day) ?? 0) >= CODING_DAY_THRESHOLD_MS,
      ),
    ) ?? -Infinity,
  );

  // Khoảng cần xét phải được mọi nguồn chép đầy đủ.
  const dataUntil = dataUntilOf(sources);
  const coveredFromReference = sources.every(
    (source) =>
      source.coveredFrom !== null && source.coveredFrom.getTime() <= reference,
  );
  if (!dataUntil || !coveredFromReference) return null;

  const idleDays = Math.floor((dataUntil.getTime() - reference) / DAY_MS);
  return idleDays >= D1_IDLE_DAYS
    ? { kind: 'ACTIVE_WITHOUT_ACTIVITY', idleDays }
    : null;
}

/**
 * D2: tuyên bố tạm dừng nhưng có hoạt động ở ≥ K ngày khác nhau trong lần
 * tạm dừng này.
 */
function pausedWithActivity(
  timeline: DeclarationTimeline,
  { events, coding }: Evidence,
  timeZone: string,
): Divergence | null {
  const pausedSince = timeline.lastEntryInto(['PAUSED']);
  if (!pausedSince) return null;

  // Ngày khác nhau, không phải số commit: một tối sửa gấp vẫn là 1 ngày.
  const days = new Set(
    events
      .filter((event) => event.occurredAt.getTime() >= pausedSince.getTime())
      .map((event) => calendarDayAt(event.occurredAt, timeZone)),
  );
  const codingByDay = msByDay(
    splitAtBoundaries(
      clipIntervals(coding, pausedSince.getTime(), Infinity),
      timeline,
      timeZone,
    ),
  );
  for (const [day, ms] of codingByDay) {
    if (ms >= CODING_DAY_THRESHOLD_MS) days.add(day);
  }
  return days.size >= D2_ACTIVE_DAYS
    ? { kind: 'PAUSED_WITH_ACTIVITY', activeDays: days.size }
    : null;
}

/** D3: đã khép nhưng vẫn có hoạt động sau khi Cycle cuối khép. */
function activityAfterClose(
  timeline: DeclarationTimeline,
  { events, coding }: Evidence,
  codingMeasured: boolean,
): Divergence | null {
  // Stop từ NOT_STARTED không khép Cycle nào → không có D3.
  const closedAt = timeline.lastCycleClose();
  if (!closedAt) return null;

  const after = events.filter(
    (event) => event.occurredAt.getTime() >= closedAt.getTime(),
  );
  const codingAfter = clipIntervals(coding, closedAt.getTime(), Infinity);
  const codingCounts = totalMs(codingAfter) >= CODING_DAY_THRESHOLD_MS;
  if (after.length === 0 && !codingCounts) return null;

  const commits = after.filter(
    (event) => event.kind === 'COMMIT_AUTHORED',
  ).length;
  return {
    kind: 'ACTIVITY_AFTER_CLOSE',
    closedAs: timeline.currentState === 'COMPLETED' ? 'COMPLETED' : 'STOPPED',
    commits,
    otherEvents: after.length - commits,
    codingSeconds: codingMeasured
      ? Math.floor(totalMs(codingAfter) / 1000)
      : null,
    lastActivityAt: latestOf(after, codingCounts ? codingAfter : []),
  };
}

/** D4: chưa bắt đầu nhưng đã có hoạt động sau khi chính nguồn đó được gắn. */
function activityBeforeStart(
  linked: readonly ActivityEvent[],
  { events }: Evidence,
  sources: readonly LinkedSource[],
  now: Date,
): Divergence | null {
  // Lịch sử lâu năm của nguồn trước lúc gắn không bị coi là "đã làm";
  // đoạn code vắt qua lúc gắn chỉ tính phần sau (08 §4.8).
  const linkedAt = new Map(
    sources.map((source) => [source.feedId, source.linkedAt.getTime()]),
  );
  const after = events.filter(
    (event) => event.occurredAt.getTime() >= (linkedAt.get(event.feedId) ?? 0),
  );
  const codingAfter = clipIntervals(
    codingIntervals(linked, linkedAt),
    -Infinity,
    now.getTime(),
  );
  const codingCounts = totalMs(codingAfter) >= CODING_DAY_THRESHOLD_MS;
  if (after.length === 0 && !codingCounts) return null;
  return {
    kind: 'ACTIVITY_BEFORE_START',
    lastActivityAt: latestOf(after, codingCounts ? codingAfter : []),
  };
}

const latestOf = (
  events: readonly ActivityEvent[],
  coding: readonly Interval[],
): Date =>
  new Date(
    Math.max(
      ...events.map((event) => event.occurredAt.getTime()),
      latestEnd(coding) ?? -Infinity,
    ),
  );
