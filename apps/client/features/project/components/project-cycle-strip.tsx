import type { ProjectCycleResponse } from "@repo/contracts";

import {
  calendarDayIn,
  cycleDayNumber,
} from "@/features/today/lib/today-focus";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

/** Số ngày lịch (tính cả hai đầu) của một khoảng, theo múi giờ tài khoản. */
function daysBetween(from: string, to: string, timeZone: string): number {
  const start = Date.parse(`${calendarDayIn(from, timeZone)}T00:00:00.000Z`);
  const end = Date.parse(`${calendarDayIn(to, timeZone)}T00:00:00.000Z`);
  return Math.max(1, Math.round((end - start) / DAY_MS) + 1);
}

/** "29/10": dải hẹp, năm đã có ở dòng tóm tắt. */
function shortDay(iso: string, timeZone: string): string {
  const [, month, date] = calendarDayIn(iso, timeZone).split("-");
  return `${date}/${month}`;
}

const END_LABEL = { COMPLETED: "Hoàn thành", STOPPED: "Dừng" } as const;

interface Segment {
  id: string;
  title: string;
  dates: string;
  status: string;
  days: number;
  tone: "completed" | "stopped" | "open";
}

/**
 * "Các vòng luyện": mọi Cycle trên một dải, cũ nhất bên trái, độ rộng theo số
 * ngày. Vòng đang mở được nhấn bằng màu ember, vòng dừng chỉ còn viền.
 */
export function ProjectCycleStrip({
  closedCycles,
  currentCycle,
  paused,
  today,
  timeZone,
}: {
  /** Mới nhất trước, như API trả về. */
  closedCycles: readonly ProjectCycleResponse[];
  currentCycle: ProjectCycleResponse | null;
  paused: boolean;
  today: string;
  timeZone: string;
}) {
  const day = (iso: string) => shortDay(iso, timeZone);

  const segments: Segment[] = [...closedCycles]
    .reverse()
    .filter((cycle) => cycle.endedAt)
    .map((cycle) => ({
      id: cycle.id,
      title: `Cycle ${cycle.cycleNumber}`,
      dates: `${day(cycle.startedAt)} – ${day(cycle.endedAt!)}`,
      status: cycle.endReason ? END_LABEL[cycle.endReason] : "Đã khép",
      days: daysBetween(cycle.startedAt, cycle.endedAt!, timeZone),
      tone: cycle.endReason === "STOPPED" ? "stopped" : "completed",
    }));

  if (currentCycle && !currentCycle.endedAt) {
    const dayNumber = cycleDayNumber(currentCycle.startedAt, today, timeZone);
    segments.push({
      id: currentCycle.id,
      title: `Cycle ${currentCycle.cycleNumber}`,
      dates: currentCycle.targetEndAt
        ? `${day(currentCycle.startedAt)} → dự kiến ${shortDay(`${currentCycle.targetEndAt}T00:00:00.000Z`, "UTC")}`
        : `từ ${day(currentCycle.startedAt)}`,
      status: `${paused ? "tạm dừng" : "đang chạy"} · ngày ${dayNumber}`,
      days: dayNumber,
      tone: "open",
    });
  }

  if (segments.length === 0) return null;
  const first = [...closedCycles].at(-1) ?? currentCycle;

  return (
    <section
      aria-labelledby="project-cycles"
      className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-6 sm:px-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="project-cycles"
          className="font-display text-[26px] font-medium"
        >
          Các vòng luyện
        </h2>
        <p className="text-sm text-muted-foreground">
          {segments.length} vòng
          {first
            ? ` · từ ${new Intl.DateTimeFormat("vi-VN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone,
              }).format(new Date(first.startedAt))}`
            : null}
        </p>
      </div>
      <div className="overflow-x-auto">
        <ol className="flex min-w-full gap-1.5">
          {segments.map((segment) => (
            <li
              key={segment.id}
              style={{ flexGrow: segment.days }}
              className="flex min-w-24 basis-0 flex-col gap-2"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-10 rounded-[10px]",
                  segment.tone === "completed" && "bg-ember/35",
                  segment.tone === "stopped" &&
                    "border-[1.5px] border-dashed border-trace-missed",
                  segment.tone === "open" && "bg-ember",
                )}
              />
              <span
                className={cn(
                  "truncate text-[13px] font-medium",
                  segment.tone === "open" && "text-primary",
                )}
              >
                {segment.title}
              </span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {segment.dates} · {segment.status}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
