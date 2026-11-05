import type {
  ActivityDayState,
  ProjectActivityResponse,
  ProjectResponse,
} from "@repo/contracts";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  cycleDayNumber,
  formatCodingHours,
  lastSevenActivityDays,
  type WeekCell,
} from "@/features/today/lib/today-focus";
import { cn } from "@/lib/utils";

const DAY_CLASSES: Record<ActivityDayState | "OUTSIDE", string> = {
  ACTIVE: "bg-ember",
  PAUSED_ACTIVE: "bg-ember/60",
  PAUSED_IDLE: "border border-dashed border-border",
  IDLE: "border-[1.5px] border-trace-missed",
  NO_DATA: "border border-dashed border-border",
  OUTSIDE: "",
};

const DAY_LABELS: Record<ActivityDayState | "OUTSIDE", string> = {
  ACTIVE: "có hoạt động",
  PAUSED_ACTIVE: "có hoạt động lúc tạm dừng",
  PAUSED_IDLE: "tạm dừng",
  IDLE: "không có hoạt động",
  NO_DATA: "chưa có dữ liệu",
  OUTSIDE: "trước Cycle",
};

export function Week({ cells, today }: { cells: WeekCell[]; today: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <ol aria-label="7 ngày qua" className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => (
          <li
            key={cell.date}
            title={`${cell.weekday}: ${DAY_LABELS[cell.state]}`}
            className={cn(
              "h-7 rounded-lg",
              DAY_CLASSES[cell.state],
              cell.date === today && "ring-2 ring-primary",
            )}
          >
            <span className="sr-only">
              {cell.weekday}: {DAY_LABELS[cell.state]}
            </span>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1.5 text-center font-mono text-[10px] text-muted-foreground"
      >
        {cells.map((cell) => (
          <span
            key={cell.date}
            className={cn(cell.date === today && "font-medium text-foreground")}
          >
            {cell.weekday}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[34px] leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </div>
  );
}

export async function Activity({
  activityPromise,
  today,
}: {
  activityPromise: Promise<ProjectActivityResponse>;
  today: string;
}) {
  let activity: ProjectActivityResponse;
  try {
    activity = await activityPromise;
  } catch {
    // Nguồn hoạt động lỗi không làm hỏng trang Hôm nay.
    return null;
  }
  const cycle = activity.currentCycle;
  if (!cycle) return null;

  return (
    <>
      <Week cells={lastSevenActivityDays(cycle.days, today)} today={today} />
      <div className="flex flex-wrap gap-x-7 gap-y-3">
        <Metric
          value={String(cycle.metrics.activeDays)}
          label="ngày có hoạt động"
        />
        <Metric value={String(cycle.metrics.commits)} label="commit" />
        {cycle.metrics.codingSeconds !== null ? (
          <Metric
            value={formatCodingHours(cycle.metrics.codingSeconds)}
            label="giờ code"
          />
        ) : null}
      </div>
    </>
  );
}

function ActivitySkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Đang tải hoạt động của Cycle…</span>
      <Skeleton aria-hidden="true" className="h-7 w-full bg-background/60" />
      <Skeleton aria-hidden="true" className="h-9 w-48 bg-background/60" />
    </div>
  );
}

/** Thẻ Crucible: Project đang luyện, ý định của Cycle và tuần hoạt động. */
export function TodayCrucible({
  project,
  activityPromise,
  today,
  timeZone,
}: {
  project: ProjectResponse | null;
  activityPromise: Promise<ProjectActivityResponse> | null;
  today: string;
  timeZone: string;
}) {
  if (!project?.currentCycle) {
    return (
      <section
        aria-labelledby="today-crucible"
        className="flex h-full flex-col gap-3 rounded-3xl border border-dashed px-6 py-6"
      >
        <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          Crucible
        </p>
        <h2 id="today-crucible" className="font-display text-2xl">
          Chưa có Project nào đang luyện.
        </h2>
        <Link
          href="/projects"
          className="self-start rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Xem các Project
        </Link>
      </section>
    );
  }

  const cycle = project.currentCycle;
  return (
    <section
      aria-labelledby="today-crucible"
      className="flex h-full flex-col gap-4 rounded-3xl bg-ember-soft px-6 py-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          Crucible · đang luyện
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          Cycle {cycle.cycleNumber} · ngày{" "}
          {cycleDayNumber(cycle.startedAt, today, timeZone)}
        </p>
      </div>
      <h2
        id="today-crucible"
        className="font-display text-[30px] leading-tight font-medium"
      >
        <Link
          href={`/projects/${project.id}`}
          className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {project.title}
        </Link>
      </h2>
      {cycle.intendedOutcome ? (
        <p className="font-display text-[19px] leading-normal italic">
          {cycle.intendedOutcome}
        </p>
      ) : null}
      {activityPromise ? (
        <Suspense fallback={<ActivitySkeleton />}>
          <Activity activityPromise={activityPromise} today={today} />
        </Suspense>
      ) : null}
    </section>
  );
}
