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
  DAY_STATE_LABEL,
  dayDescription,
  divergenceText,
  freshnessLine,
  legendStates,
  sourceErrorLines,
  summaryLine,
  WEEK_ROWS_AFTER_DAYS,
} from "@/features/project-activity/lib/activity-presentation";
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

const capitalize = (text: string) => text[0]!.toUpperCase() + text.slice(1);

/** Dải ngày của vòng: ngày cuối ở cuối, quá 70 ngày thì xuống dòng theo tuần. */
export function DayStrip({
  days,
  label,
}: {
  days: readonly ActivityDay[];
  label: string;
}) {
  const weekly = days.length > WEEK_ROWS_AFTER_DAYS;
  return (
    <div className="flex flex-col gap-2">
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
      <ul
        aria-label="Chú thích"
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
      >
        {legendStates(days).map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <DayCell state={state} />
            {capitalize(DAY_STATE_LABEL[state])}
          </li>
        ))}
      </ul>
    </div>
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

  return (
    <section
      aria-labelledby="cycle-activity-title"
      className="mt-6 flex flex-col gap-4 border-t pt-5"
    >
      <h2
        id="cycle-activity-title"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-primary"
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

      <DayStrip days={cycle.days} label="Dải ngày của vòng này" />

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium tabular-nums">{summaryLine(cycle)}</p>
        {freshness ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {freshness}
          </p>
        ) : null}
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
