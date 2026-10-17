import {
  type ActivityEvent,
  dataUntilOf,
  type LinkedSource,
} from '../activity-evidence';
import { calendarDayAt } from '../calendar-day';
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
      lastActivityAt: Date;
    }
  | { kind: 'ACTIVITY_BEFORE_START'; lastActivityAt: Date };

/**
 * Chỗ lệch giữa lời tuyên bố hiện tại và hoạt động (02 §4, BR-PAC-022…025).
 * Chỉ chỉ ra — không bao giờ đổi trạng thái. Tối đa một mục mỗi loại.
 */
export function detectDivergences(input: {
  timeline: DeclarationTimeline;
  events: readonly ActivityEvent[];
  sources: readonly LinkedSource[];
  timeZone: string;
  now: Date;
}): Divergence[] {
  const { timeline, sources, timeZone, now } = input;
  // Không có nguồn thì không có bằng chứng để đặt cạnh lời tuyên bố.
  if (sources.length === 0) return [];

  const linkedFeeds = new Set(sources.map((source) => source.feedId));
  // Event của nguồn đang gắn; event ghi ngày tương lai không tính.
  const events = input.events.filter(
    (event) =>
      linkedFeeds.has(event.feedId) &&
      event.occurredAt.getTime() <= now.getTime(),
  );

  const divergence = (() => {
    switch (timeline.currentState) {
      case 'ACTIVE':
        return activeWithoutActivity(timeline, events, sources);
      case 'PAUSED':
        return pausedWithActivity(timeline, events, timeZone);
      case 'STOPPED':
      case 'COMPLETED':
        return activityAfterClose(timeline, events);
      case 'NOT_STARTED':
        return activityBeforeStart(events, sources);
    }
  })();
  return divergence ? [divergence] : [];
}

/** D1: tuyên bố đang làm nhưng N ngày không có event. */
function activeWithoutActivity(
  timeline: DeclarationTimeline,
  events: readonly ActivityEvent[],
  sources: readonly LinkedSource[],
): Divergence | null {
  // Sự vắng mặt chỉ có nghĩa khi đọc được nguồn (6.8, RP-PAC-002).
  if (sources.some((source) => source.status !== 'ACTIVE')) return null;

  const activeSince = timeline.lastEntryInto(['ACTIVE']);
  const cycleId = timeline.currentCycleId;
  if (!activeSince || !cycleId) return null;

  // Mốc: muộn hơn giữa event gần nhất của Cycle và lần vào ACTIVE gần nhất —
  // vừa Start/Resume xong không bị nhắc ngay.
  let reference = activeSince.getTime();
  for (const event of events) {
    const attribution = attributeEvent(event, timeline);
    if (attribution.inCycle && attribution.cycleId === cycleId) {
      reference = Math.max(reference, event.occurredAt.getTime());
    }
  }

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

/** D2: tuyên bố tạm dừng nhưng có event ở ≥ K ngày khác nhau trong lần tạm dừng này. */
function pausedWithActivity(
  timeline: DeclarationTimeline,
  events: readonly ActivityEvent[],
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
  return days.size >= D2_ACTIVE_DAYS
    ? { kind: 'PAUSED_WITH_ACTIVITY', activeDays: days.size }
    : null;
}

/** D3: đã khép nhưng vẫn có event sau khi Cycle cuối khép. */
function activityAfterClose(
  timeline: DeclarationTimeline,
  events: readonly ActivityEvent[],
): Divergence | null {
  // Stop từ NOT_STARTED không khép Cycle nào → không có D3.
  const closedAt = timeline.lastCycleClose();
  if (!closedAt) return null;

  const after = events.filter(
    (event) => event.occurredAt.getTime() >= closedAt.getTime(),
  );
  if (after.length === 0) return null;

  const commits = after.filter(
    (event) => event.kind === 'COMMIT_AUTHORED',
  ).length;
  return {
    kind: 'ACTIVITY_AFTER_CLOSE',
    closedAs: timeline.currentState === 'COMPLETED' ? 'COMPLETED' : 'STOPPED',
    commits,
    otherEvents: after.length - commits,
    lastActivityAt: latest(after),
  };
}

/** D4: chưa bắt đầu nhưng đã có event sau khi chính nguồn đó được gắn. */
function activityBeforeStart(
  events: readonly ActivityEvent[],
  sources: readonly LinkedSource[],
): Divergence | null {
  // Lịch sử lâu năm của repository trước lúc gắn không bị coi là "đã làm".
  const linkedAt = new Map(
    sources.map((source) => [source.feedId, source.linkedAt.getTime()]),
  );
  const after = events.filter(
    (event) => event.occurredAt.getTime() >= (linkedAt.get(event.feedId) ?? 0),
  );
  return after.length > 0
    ? { kind: 'ACTIVITY_BEFORE_START', lastActivityAt: latest(after) }
    : null;
}

const latest = (events: readonly ActivityEvent[]): Date =>
  new Date(Math.max(...events.map((event) => event.occurredAt.getTime())));
