"use client";

import type { HabitOverviewItemEnvelope } from "@repo/contracts";
import { useEditedHabit } from "@/features/habit/components/habit-edit-sheet";
import { HabitRelapseControl } from "@/features/habit/components/habit-relapse-control";
import { useHabitCheckIn } from "@/features/habit/hooks/use-habit-check-in";
import type { HabitTodayLabels } from "@/features/habit/lib/habit-today-labels";
import { tallyHabitTrace } from "@/features/habit/lib/habit-trace";
import { cn } from "@/lib/utils";

function Stat({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/**
 * Con số chuỗi và khối "Hôm nay" dùng chung một trạng thái ghi dấu. Lưới 13
 * tuần là server component (giữ bundle trang nhỏ), đổi theo khi refresh.
 */
export function HabitStreakPanel({
  overview,
  labels,
}: {
  overview: HabitOverviewItemEnvelope;
  labels: HabitTodayLabels;
}) {
  const { habit: item, trace } = overview;
  const isActive = useEditedHabit().state === "ACTIVE";
  const { checked, streak, withToday, message, isPending, toggle } =
    useHabitCheckIn(item);
  const isQuit = item.type === "QUIT";
  // Các con số 13 tuần đổi cùng lúc với chuỗi.
  const { done, missed } = tallyHabitTrace(withToday(trace));

  const headline = isQuit
    ? "Mỗi ngày giữ được là một ngày."
    : checked
      ? item.checkedInToday && labels.checkedIn
        ? labels.checkedIn
        : "Đã ghi dấu hôm nay."
      : labels.idle;

  return (
    <section
      aria-label={
        isQuit ? "Số ngày không tái phạm" : "Chuỗi và ghi dấu hôm nay"
      }
      className="flex flex-wrap items-stretch gap-6"
    >
      <div className="flex flex-[2_1_26rem] flex-wrap items-end gap-x-7 gap-y-4 rounded-3xl border bg-card px-6 py-7 sm:px-9 sm:py-8">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-8xl leading-[0.82] tracking-[-0.04em] text-primary tabular-nums sm:text-[148px]">
            {streak}
          </span>
          <span className="font-medium">
            {isQuit ? "ngày không tái phạm" : "buổi liên tiếp đúng lịch"}
          </span>
        </div>
        <div className="flex flex-col gap-2 pb-1.5">
          {isQuit ? (
            <>
              {labels.quitSince ? (
                <Stat>
                  Tính từ{" "}
                  <strong className="font-semibold text-foreground">
                    {labels.quitSince}
                  </strong>
                </Stat>
              ) : null}
              <Stat>
                <strong className="font-semibold text-foreground">
                  {missed}
                </strong>{" "}
                ngày tái phạm trong 13 tuần
              </Stat>
            </>
          ) : (
            <>
              {item.longestStreak ? (
                streak > 0 && streak >= item.longestStreak ? (
                  <Stat>
                    Đang là{" "}
                    <strong className="font-semibold text-foreground">
                      chuỗi dài nhất
                    </strong>{" "}
                    từ trước tới nay
                  </Stat>
                ) : (
                  <Stat>
                    Chuỗi dài nhất{" "}
                    <strong className="font-semibold text-foreground">
                      {item.longestStreak}
                    </strong>{" "}
                    buổi
                  </Stat>
                )
              ) : null}
              <Stat>
                <strong className="font-semibold text-foreground">
                  {done}
                </strong>{" "}
                buổi đã ghi dấu,{" "}
                <strong className="font-semibold text-foreground">
                  {missed}
                </strong>{" "}
                buổi bỏ lỡ trong 13 tuần
              </Stat>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-[1_1_18rem] flex-col justify-between gap-5 rounded-3xl bg-block p-7 text-block-foreground">
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-block-foreground/75 uppercase">
            Hôm nay · {labels.today}
          </p>
          <p className="font-display text-2xl">{headline}</p>
        </div>

        {isQuit ? (
          <HabitRelapseControl habitId={item.id} disabled={!isActive} />
        ) : (
          <button
            type="button"
            aria-pressed={checked}
            disabled={!isActive || isPending}
            onClick={toggle}
            className="inline-flex min-h-14 cursor-pointer items-center gap-3 self-start rounded-full bg-paper py-2.5 pr-6 pl-2.5 font-semibold text-paper-ink transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-block disabled:cursor-not-allowed disabled:opacity-60 motion-safe:active:scale-95"
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-9 place-items-center rounded-full transition-colors duration-200",
                checked ? "bg-ember" : "border-2 border-dashed border-ember",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4 stroke-ember-foreground"
                fill="none"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  pathLength={1}
                  strokeDasharray={1}
                  className={cn(
                    "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-safe:ease-out",
                    checked ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1]",
                  )}
                />
              </svg>
            </span>
            Ghi dấu hôm nay
          </button>
        )}

        {message ? (
          <p role="alert" className="text-sm text-block-foreground">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
