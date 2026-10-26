import type { CycleActivitySnapshotResponse } from "@repo/contracts";

import {
  snapshotSourceLines,
  summaryLine,
} from "@/features/project-activity/lib/activity-presentation";

import { DayStrip } from "./cycle-activity";

/**
 * "Hoạt động của vòng" trong một Cycle đã đóng (06 §10): đúng như lúc chụp,
 * không tính lại — kể cả múi giờ và tên nguồn.
 */
export function CycleSnapshot({
  snapshot,
  cycleNumber,
  closedAt,
}: {
  snapshot: CycleActivitySnapshotResponse;
  cycleNumber: number;
  /** Lúc Cycle đóng — mốc để biết nguồn nào đã chép đủ. */
  closedAt: string;
}) {
  const sources = snapshotSourceLines(snapshot, closedAt);
  return (
    <section
      aria-label={`Hoạt động của Cycle ${cycleNumber}`}
      className="flex flex-col gap-3 border-t pt-4"
    >
      <p className="text-xs font-semibold text-muted-foreground">
        Hoạt động của vòng
      </p>
      <DayStrip
        days={snapshot.days}
        label={`Dải ngày của Cycle ${cycleNumber}`}
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium tabular-nums">
          {summaryLine({
            days: snapshot.days,
            metrics: snapshot.metrics,
            hasMissingData: sources.incomplete,
            providers: snapshot.sources.map((source) => source.provider),
          })}
        </p>
        {sources.lines.map((line) => (
          <p key={line} className="text-xs text-muted-foreground tabular-nums">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
