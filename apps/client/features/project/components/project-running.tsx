import type { ProjectActivityResponse, ProjectResponse } from "@repo/contracts";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getProjectActivity } from "@/features/project-activity/api/project-activity";
import { Activity, Week } from "@/features/today/components/today-crucible";
import {
  cycleDayNumber,
  lastSevenActivityDays,
} from "@/features/today/lib/today-focus";
import { cn } from "@/lib/utils";

type Running = ProjectResponse & {
  currentCycle: NonNullable<ProjectResponse["currentCycle"]>;
};

function ActivitySkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Đang tải hoạt động của Cycle…</span>
      <Skeleton aria-hidden="true" className="h-7 w-full bg-background/60" />
      {compact ? null : (
        <Skeleton aria-hidden="true" className="h-9 w-48 bg-background/60" />
      )}
    </div>
  );
}

/** Thẻ gọn chỉ cần tuần hoạt động và một dòng số liệu. */
async function CompactActivity({
  activityPromise,
  today,
}: {
  activityPromise: Promise<ProjectActivityResponse>;
  today: string;
}) {
  const activity = await activityPromise.catch(() => null);
  const cycle = activity?.currentCycle;
  if (!cycle) return null;
  return (
    <>
      <Week cells={lastSevenActivityDays(cycle.days, today)} today={today} />
      <p className="text-sm text-muted-foreground tabular-nums">
        {cycle.metrics.activeDays} ngày có hoạt động · {cycle.metrics.commits}{" "}
        commit
      </p>
    </>
  );
}

function RunningCard({
  project,
  today,
  timeZone,
  compact,
}: {
  project: Running;
  today: string;
  timeZone: string;
  compact: boolean;
}) {
  const cycle = project.currentCycle;
  const activityPromise = getProjectActivity(project.id);
  const headingId = `running-${project.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col rounded-3xl bg-ember-soft",
        compact ? "gap-3 px-5 py-5" : "gap-4 px-6 py-6 sm:px-8 sm:py-7",
      )}
    >
      <p className="font-mono text-xs text-muted-foreground tabular-nums">
        Cycle {cycle.cycleNumber} · ngày{" "}
        {cycleDayNumber(cycle.startedAt, today, timeZone)}
      </p>
      <h3
        id={headingId}
        className={cn(
          "font-display leading-tight font-medium",
          compact ? "text-2xl" : "text-[34px]",
        )}
      >
        <Link
          href={`/projects/${project.id}`}
          className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {project.title}
        </Link>
      </h3>
      {cycle.intendedOutcome ? (
        <p
          className={cn(
            "font-display leading-normal italic",
            compact ? "line-clamp-2 text-base" : "text-[19px]",
          )}
        >
          {cycle.intendedOutcome}
        </p>
      ) : null}
      <Suspense fallback={<ActivitySkeleton compact={compact} />}>
        {compact ? (
          <CompactActivity activityPromise={activityPromise} today={today} />
        ) : (
          <Activity activityPromise={activityPromise} today={today} />
        )}
      </Suspense>
    </article>
  );
}

/**
 * Các Project đang luyện ở đầu trang: một cái thì là thẻ lớn, nhiều cái thì
 * lưới hai cột thẻ gọn. Mỗi thẻ tải hoạt động riêng, thẻ chậm không giữ trang.
 */
export function ProjectRunning({
  projects,
  today,
  timeZone,
}: {
  projects: readonly ProjectResponse[];
  today: string;
  timeZone: string;
}) {
  const running = projects.filter(
    (project): project is Running => project.currentCycle !== null,
  );
  if (running.length === 0) return null;
  const compact = running.length > 1;

  return (
    <section aria-labelledby="project-running" className="flex flex-col gap-4">
      <h2
        id="project-running"
        className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase"
      >
        Đang luyện · {running.length}
      </h2>
      <div className={cn("grid gap-4", compact && "md:grid-cols-2")}>
        {running.map((project) => (
          <RunningCard
            key={project.id}
            project={project}
            today={today}
            timeZone={timeZone}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}
