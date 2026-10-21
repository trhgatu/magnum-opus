import type { ActivityEvent } from './activity-evidence';
import {
  addDays,
  type CalendarDay,
  calendarDayAt,
  startOfDay,
} from './calendar-day';
import type {
  DeclarationSegment,
  DeclarationTimeline,
} from './declaration-timeline';

/**
 * Một ngày có hoạt động nhờ code khi tổng thời gian code từ ngưỡng này trở
 * lên (BR-PAC-041). Tham số hiệu chỉnh (OQ-PAC-002), không phải mục tiêu.
 */
export const CODING_DAY_THRESHOLD_MS = 15 * 60_000;

/** Khoảng nửa mở [start, end), mili giây. */
export interface Interval {
  start: number;
  end: number;
}

/** Một phần của khoảng code, nằm trọn trong một ngày và một khoảng tuyên bố. */
export interface CodingPiece extends Interval {
  day: CalendarDay;
  segment: DeclarationSegment;
}

export const isCodingTime = (event: Pick<ActivityEvent, 'kind'>): boolean =>
  event.kind === 'CODING_TIME';

/** Event có thời điểm (commit, PR) — mọi loại trừ thời gian code. */
export const isPointEvent = (event: Pick<ActivityEvent, 'kind'>): boolean =>
  !isCodingTime(event);

/**
 * Khoảng code của các event CODING_TIME (bắt đầu + số giây), đã hợp: hai
 * nguồn trùng giờ chỉ tính một lần (BR-PAC-040). `notBefore` cắt bỏ phần
 * trước một mốc riêng của từng feed (vd lúc gắn nguồn — D4).
 */
export function codingIntervals(
  events: readonly ActivityEvent[],
  notBefore?: ReadonlyMap<string, number>,
): Interval[] {
  const intervals = events.filter(isCodingTime).flatMap((event) => {
    const start = Math.max(
      event.occurredAt.getTime(),
      notBefore?.get(event.feedId) ?? -Infinity,
    );
    const end = event.occurredAt.getTime() + event.quantity * 1000;
    return start < end ? [{ start, end }] : [];
  });
  return unionIntervals(intervals);
}

/** Hợp các khoảng: sắp theo lúc bắt đầu, gộp khoảng chồng hoặc chạm nhau. */
export function unionIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

/** Phần của các khoảng nằm trong [from, to). */
export function clipIntervals(
  intervals: readonly Interval[],
  from: number,
  to: number,
): Interval[] {
  return intervals.flatMap((interval) => {
    const start = Math.max(interval.start, from);
    const end = Math.min(interval.end, to);
    return start < end ? [{ start, end }] : [];
  });
}

export const totalMs = (intervals: readonly Interval[]): number =>
  intervals.reduce((sum, interval) => sum + interval.end - interval.start, 0);

/**
 * Cắt mỗi khoảng tại nửa đêm (múi giờ tài khoản) và tại mỗi lần chuyển
 * trạng thái (BR-PAC-039): mỗi phần thuộc đúng một ngày và một lời tuyên
 * bố, nên được gán như một event riêng. Sổ không bị sửa — chỉ tính.
 */
export function splitAtBoundaries(
  intervals: readonly Interval[],
  timeline: DeclarationTimeline,
  timeZone: string,
): CodingPiece[] {
  const pieces: CodingPiece[] = [];
  for (const interval of intervals) {
    let cursor = interval.start;
    while (cursor < interval.end) {
      const at = new Date(cursor);
      const segment = timeline.segmentAt(at);
      const day = calendarDayAt(at, timeZone);
      const next = Math.min(
        interval.end,
        segment.to?.getTime() ?? Infinity,
        startOfDay(addDays(day, 1), timeZone).getTime(),
      );
      pieces.push({ start: cursor, end: next, day, segment });
      cursor = next;
    }
  }
  return pieces;
}

/** Tổng mili giây code theo ngày. */
export function msByDay(
  pieces: readonly CodingPiece[],
): Map<CalendarDay, number> {
  const byDay = new Map<CalendarDay, number>();
  for (const piece of pieces) {
    byDay.set(piece.day, (byDay.get(piece.day) ?? 0) + piece.end - piece.start);
  }
  return byDay;
}

/** Lúc kết thúc muộn nhất; null khi không có phần nào. */
export const latestEnd = (intervals: readonly Interval[]): number | null =>
  intervals.length === 0
    ? null
    : Math.max(...intervals.map((interval) => interval.end));
