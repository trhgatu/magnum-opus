import type { ActivitySourceStatus } from '@repo/contracts';

/** Loại sự kiện trong sổ (02 §2.1) — domain không biết nguồn là gì. */
export type ActivityEventKind = 'COMMIT_AUTHORED' | 'PR_OPENED' | 'PR_MERGED';

/** Một dòng sổ hoạt động, như tầng activity cho đọc. */
export interface ActivityEvent {
  feedId: string;
  kind: ActivityEventKind;
  occurredAt: Date;
  quantity: number;
}

/** Phần sổ một nguồn có được; ngoài [coveredFrom, syncedUntil) là "không có dữ liệu". */
export interface SourceCoverage {
  status: ActivitySourceStatus;
  coveredFrom: Date | null;
  syncedUntil: Date | null;
}

/** Một nguồn đang gắn vào Project. */
export interface LinkedSource extends SourceCoverage {
  feedId: string;
  linkedAt: Date;
}

/** Nguồn chép được liền mạch qua thời điểm `instant`. */
export const coversInstant = (source: SourceCoverage, instant: Date): boolean =>
  source.coveredFrom !== null &&
  source.syncedUntil !== null &&
  source.coveredFrom.getTime() <= instant.getTime() &&
  instant.getTime() < source.syncedUntil.getTime();

/** Nhỏ nhất trong syncedUntil; null nếu có nguồn chưa từng được chép. */
export function dataUntilOf(sources: readonly SourceCoverage[]): Date | null {
  if (sources.length === 0) return null;
  let earliest: number | null = null;
  for (const source of sources) {
    if (source.syncedUntil === null) return null;
    const time = source.syncedUntil.getTime();
    earliest = earliest === null ? time : Math.min(earliest, time);
  }
  return earliest === null ? null : new Date(earliest);
}
