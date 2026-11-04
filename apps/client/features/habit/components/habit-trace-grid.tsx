import type { HabitOverviewDayResponse, HabitType } from "@repo/contracts";

import { HABIT_DAY_MARK_CLASSES } from "@/features/habit/lib/habit-day-mark";
import {
  describeHabitTrace,
  describeTraceDay,
  layoutHabitTrace,
} from "@/features/habit/lib/habit-trace";
import { cn } from "@/lib/utils";

const ROW_LABELS = ["T2", "", "T4", "", "T6", "", "CN"];

function Legend({ type }: { type: HabitType }) {
  const quit = type === "QUIT";
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3.5 rounded bg-trace-done" />
        {quit ? "Không tái phạm" : "Đã ghi dấu"}
      </li>
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-3.5 rounded border-[1.5px] border-trace-missed"
        />
        {quit ? "Tái phạm" : "Bỏ lỡ"}
      </li>
      {quit ? null : (
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="grid size-3.5 place-items-center">
            <span className="size-1 rounded-full bg-trace-rest" />
          </span>
          Ngày nghỉ theo lịch
        </li>
      )}
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-3.5 rounded border-2 border-primary bg-ember-soft"
        />
        Hôm nay
      </li>
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
          className="inline-flex gap-1.5"
        >
          <div
            aria-hidden="true"
            className="flex flex-col gap-1.5 pt-[22px] font-mono text-[11px] text-muted-foreground"
          >
            {ROW_LABELS.map((label, index) => (
              <span key={index} className="h-[22px] leading-[22px]">
                {label}
              </span>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              aria-hidden="true"
              // Cột rộng đúng bằng ô: nhãn "Th 10" tràn sang phải, không đẩy lưới.
              className="flex w-[22px] flex-col gap-1.5"
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
                      "grid size-[22px] place-items-center rounded-md",
                      HABIT_DAY_MARK_CLASSES[cell.mark],
                      // Hôm nay đã làm thì thêm viền; chưa làm đã có kiểu
                      // PENDING. Tái phạm hôm nay giữ nguyên kiểu bỏ lỡ.
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
                      "size-[22px] rounded-md",
                      cell.kind === "after" && "border border-dashed",
                    )}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <Legend type={type} />
    </section>
  );
}
