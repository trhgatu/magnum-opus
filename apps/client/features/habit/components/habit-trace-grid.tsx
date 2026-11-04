import type {
  HabitDayMark,
  HabitOverviewDayResponse,
  HabitType,
} from "@repo/contracts";

import { HABIT_DAY_MARK_CLASSES } from "@/features/habit/lib/habit-day-mark";
import {
  describeHabitTrace,
  describeTraceDay,
  layoutHabitTrace,
} from "@/features/habit/lib/habit-trace";
import { cn } from "@/lib/utils";

const ROW_LABELS = ["T2", "", "T4", "", "T6", "", "CN"];

// Ô vuông cố định; các cột tuần giãn đều khoảng cách cho kín hàng ngang.
const CELL = "[--cell:22px]";

function Legend({
  type,
  trace,
}: {
  type: HabitType;
  trace: readonly HabitOverviewDayResponse[];
}) {
  const quit = type === "QUIT";
  const count = (mark: HabitDayMark) =>
    trace.filter((day) => day.mark === mark).length;
  const items = [
    {
      swatch: <span className="size-3.5 rounded-sm bg-trace-done" />,
      label: quit ? "Không tái phạm" : "Đã ghi dấu",
      count: count("DONE"),
    },
    {
      swatch: (
        <span className="size-3.5 rounded-sm border-[1.5px] border-trace-missed" />
      ),
      label: quit ? "Tái phạm" : "Bỏ lỡ",
      count: count("MISSED"),
    },
    ...(quit
      ? []
      : [
          {
            swatch: (
              <span className="grid size-3.5 place-items-center">
                <span className="size-1 rounded-full bg-trace-rest" />
              </span>
            ),
            label: "Ngày nghỉ theo lịch",
            count: count("REST"),
          },
        ]),
    {
      swatch: (
        <span className="size-3.5 rounded-sm border-2 border-primary bg-ember-soft" />
      ),
      label: "Hôm nay",
      count: null,
    },
  ];

  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="contents">
            {item.swatch}
          </span>
          <span>{item.label}</span>
          {item.count === null ? null : (
            <span className="font-mono text-xs text-foreground tabular-nums">
              {item.count}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function HabitTraceGrid({
  type,
  trace,
}: {
  type: HabitType;
  trace: readonly HabitOverviewDayResponse[];
}) {
  const weeks = layoutHabitTrace(trace);
  const today = trace.at(-1)?.date;

  return (
    <section
      aria-labelledby="habit-trace-title"
      className="flex flex-col gap-5 rounded-3xl border bg-card px-5 py-6 sm:px-8 sm:py-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="habit-trace-title"
          className="font-display text-[26px] leading-tight font-medium"
        >
          Dấu vết 13 tuần
        </h2>
        <p className="text-sm text-muted-foreground">
          {type === "QUIT"
            ? "Mỗi ngày từ lúc bắt đầu bỏ"
            : "Chỉ tính những ngày có trong lịch"}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={describeHabitTrace(type, trace)}
          className={cn("flex justify-between gap-1.5", CELL)}
        >
          <div
            aria-hidden="true"
            className="flex flex-col gap-1.5 pt-[22px] font-mono text-[11px] text-muted-foreground"
          >
            {ROW_LABELS.map((label, index) => (
              <span key={index} className="h-(--cell) leading-(--cell)">
                {label}
              </span>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              aria-hidden="true"
              className="flex w-(--cell) shrink-0 flex-col gap-1.5"
            >
              <span className="h-4 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                {week.monthLabel}
              </span>
              {week.cells.map((cell, dayIndex) =>
                cell.kind === "day" ? (
                  <span
                    key={cell.date}
                    title={describeTraceDay(type, cell)}
                    className={cn(
                      "grid size-(--cell) place-items-center rounded-sm",
                      HABIT_DAY_MARK_CLASSES[cell.mark],
                      cell.date === today &&
                        cell.mark === "DONE" &&
                        "ring-2 ring-primary",
                    )}
                  >
                    {cell.mark === "REST" ? (
                      <span className="size-1 rounded-full bg-trace-rest" />
                    ) : null}
                  </span>
                ) : (
                  <span
                    key={`${cell.kind}-${dayIndex}`}
                    className={cn(
                      "size-(--cell) rounded-sm",
                      cell.kind === "after" && "border border-dashed",
                    )}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <Legend type={type} trace={trace} />
    </section>
  );
}
