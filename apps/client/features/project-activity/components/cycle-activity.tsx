import type {
  ActivityDay,
  ActivityDayState,
  CycleActivityResponse,
  Divergence,
  ProjectActivityResponse,
} from "@repo/contracts";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import {
  CycleMetrics,
  RecentDays,
} from "@/features/project-activity/components/cycle-days";
import {
  dayDescription,
  divergenceText,
  freshnessLine,
  sourceErrorLines,
  summaryLine,
  WEEK_ROWS_AFTER_DAYS,
} from "@/features/project-activity/lib/activity-presentation";
import { calendarDayIn } from "@/features/today/lib/today-focus";
import { cn } from "@/lib/utils";

const CELL_CLASS: Record<ActivityDayState, string> = {
  ACTIVE: "bg-primary",
  PAUSED_ACTIVE:
    "bg-[repeating-linear-gradient(135deg,var(--primary)_0_2px,transparent_2px_4px)] ring-1 ring-inset ring-primary/60",
  PAUSED_IDLE:
    "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--muted-foreground)_35%,transparent)_0_2px,transparent_2px_4px)] ring-1 ring-inset ring-border",
  IDLE: "bg-muted ring-1 ring-inset ring-border",
  NO_DATA: "border border-dashed border-muted-foreground/60",
};

function DayCell({ state }: { state: ActivityDayState }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block size-3 rounded-[3px]", CELL_CLASS[state])}
    />
  );
}

/**
 * Dải ngày của vòng: ngày cuối ở cuối, quá 70 ngày thì xuống dòng theo tuần.
 * Không có chú thích — mỗi ô tự mô tả qua tooltip và chữ cho trình đọc màn
 * hình (06 §8.2).
 */
export function DayStrip({
  days,
  label,
}: {
  days: readonly ActivityDay[];
  label: string;
}) {
  const weekly = days.length > WEEK_ROWS_AFTER_DAYS;
  return (
    <ol
      aria-label={label}
      className={cn(
        "gap-1",
        weekly ? "grid w-fit grid-cols-7" : "flex flex-wrap",
      )}
    >
      {days.map((day) => (
        <li key={day.date} title={dayDescription(day)}>
          <DayCell state={day.state} />
          <span className="sr-only">{dayDescription(day)}</span>
        </li>
      ))}
    </ol>
  );
}

const findDivergence = <K extends Divergence["kind"]>(
  divergences: readonly Divergence[],
  kind: K,
) =>
  divergences.find(
    (divergence): divergence is Extract<Divergence, { kind: K }> =>
      divergence.kind === kind,
  );

/**
 * "Hoạt động của vòng này" trong thẻ Cycle đang mở (06 §8). Chỉ là bằng
 * chứng: không nút nào ở đây đổi Project, trừ Tiếp tục của D2 — chính là
 * Resume (INV-PAC-P01).
 */
export function CycleActivity({
  activity,
  cycle,
  now,
  resumeAction,
}: {
  activity: ProjectActivityResponse;
  cycle: CycleActivityResponse;
  now: Date;
  /** Nút Tiếp tục của Project, chỉ hiện cùng lời nhắc D2. */
  resumeAction: ReactNode;
}) {
  const { timeZone, sources, divergences } = activity;
  const paused = findDivergence(divergences, "PAUSED_WITH_ACTIVITY");
  const idle = findDivergence(divergences, "ACTIVE_WITHOUT_ACTIVITY");
  const freshness = freshnessLine(cycle, sources, timeZone, now);
  const hasGitHub = sources.some((source) => source.provider === "GITHUB");
  const allMissing =
    cycle.days.length > 0 && cycle.days.every((day) => day.state === "NO_DATA");

  return (
    <section
      aria-labelledby="cycle-activity-title"
      className="flex flex-col gap-5 border-t border-primary/15 pt-6"
    >
      <h2
        id="cycle-activity-title"
        className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase"
      >
        Hoạt động của vòng này
      </h2>

      {paused ? (
        <div
          role="note"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2.5"
        >
          <p className="flex items-center gap-2 text-sm">
            <TriangleAlert
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            {divergenceText(paused, timeZone)}
          </p>
          {resumeAction}
        </div>
      ) : null}

      {allMissing ? null : (
        <CycleMetrics metrics={cycle.metrics} hasGitHub={hasGitHub} />
      )}

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <span>Từng ngày của vòng này</span>
          {freshness ? <span className="tabular-nums">{freshness}</span> : null}
        </div>
        <RecentDays days={cycle.days} today={calendarDayIn(now, timeZone)} />
      </div>

      <DayStrip days={cycle.days} label="Dải ngày của vòng này" />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium tabular-nums">
          {summaryLine({
            ...cycle,
            providers: sources.map((source) => source.provider),
          })}
        </p>
      </div>

      {sourceErrorLines(sources).map((line) => (
        <p key={line} className="text-xs text-destructive">
          {line}
        </p>
      ))}

      {idle ? (
        <p className="text-xs text-muted-foreground">
          {divergenceText(idle, timeZone)}
        </p>
      ) : null}
    </section>
  );
}

/** D3/D4 — dưới phần đầu trang, nhỏ, không có nút (06 §9). */
export function ActivityDivergenceNotes({
  activity,
}: {
  activity: ProjectActivityResponse;
}) {
  const notes = activity.divergences.filter(
    (divergence) =>
      divergence.kind === "ACTIVITY_AFTER_CLOSE" ||
      divergence.kind === "ACTIVITY_BEFORE_START",
  );
  if (notes.length === 0) return null;
  return (
    <div className="-mt-2 flex flex-col gap-1">
      {notes.map((divergence) => (
        <p
          key={divergence.kind}
          role="note"
          className="text-sm text-muted-foreground"
        >
          {divergenceText(divergence, activity.timeZone)}
        </p>
      ))}
    </div>
  );
}
