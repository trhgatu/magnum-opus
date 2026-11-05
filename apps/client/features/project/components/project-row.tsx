import type { ProjectResponse } from "@repo/contracts";
import Link from "next/link";

import { cn } from "@/lib/utils";

const STATE_LABELS: Record<ProjectResponse["lifecycleState"], string> = {
  NOT_STARTED: "Chưa bắt đầu",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  STOPPED: "Đã dừng",
  COMPLETED: "Hoàn thành",
};

const STATE_CLASSES: Record<ProjectResponse["lifecycleState"], string> = {
  NOT_STARTED: "border border-dashed border-border text-muted-foreground",
  ACTIVE: "bg-ember text-ember-foreground",
  PAUSED: "bg-ember-soft text-primary",
  STOPPED: "border-[1.5px] border-trace-missed text-muted-foreground",
  COMPLETED: "bg-muted text-foreground",
};

/** Dòng gọn trong danh sách: tên, trạng thái và Cycle (nếu có). */
export function ProjectRow({ project }: { project: ProjectResponse }) {
  const cycle = project.currentCycle;
  const detail = cycle
    ? `Cycle ${cycle.cycleNumber}${cycle.intendedOutcome ? ` · ${cycle.intendedOutcome}` : ""}`
    : project.description;

  return (
    <li>
      <Link
        href={`/projects/${project.id}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium">{project.title}</span>
          {detail ? (
            <span className="truncate text-sm text-muted-foreground">
              {detail}
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] tracking-[0.04em]",
            STATE_CLASSES[project.lifecycleState],
          )}
        >
          {STATE_LABELS[project.lifecycleState]}
        </span>
      </Link>
    </li>
  );
}
