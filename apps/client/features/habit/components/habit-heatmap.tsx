import type { HabitCheckInHistoryResponse } from "@repo/contracts";
import { ChartNoAxesColumnIncreasing } from "lucide-react";

import { cn } from "@/lib/utils";

const dateRange = (from: string, to: string) => {
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const dates: string[] = [];
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

export function HabitHeatmap({
  history,
}: {
  history: HabitCheckInHistoryResponse;
}) {
  const completed = new Set(history.dates);
  const days = dateRange(history.from, history.to);
  return (
    <section aria-labelledby="habit-history-heading" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <ChartNoAxesColumnIncreasing className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Trace
          </p>
          <h2
            id="habit-history-heading"
            className="font-display text-xl font-semibold"
          >
            Dấu vết 90 ngày
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {completed.size} lần hoàn thành trong khoảng đang hiển thị.
          </p>
        </div>
      </div>
      <div
        className="grid grid-flow-col grid-rows-7 justify-start gap-1.5 overflow-x-auto rounded-xl border bg-background/40 p-3"
        role="img"
        aria-label={`${completed.size} ngày đã hoàn thành từ ${history.from} đến ${history.to}`}
      >
        {days.map((date) => (
          <span
            key={date}
            title={`${date}: ${completed.has(date) ? "đã hoàn thành" : "chưa hoàn thành"}`}
            className={cn(
              "size-3.5 rounded-[4px] border",
              completed.has(date)
                ? "border-primary/60 bg-primary"
                : "border-border bg-muted/45",
            )}
          />
        ))}
      </div>
    </section>
  );
}
