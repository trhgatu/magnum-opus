"use client";

import type { HabitOverviewItemEnvelope } from "@repo/contracts";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import { useEditedHabit } from "@/features/habit/components/habit-edit-sheet";
import { HabitRelapseControl } from "@/features/habit/components/habit-relapse-control";
import {
  formatCheckInTime,
  formatNextDue,
} from "@/features/habit/lib/habit-overview";
import { formatQuitStartedAt } from "@/features/habit/lib/habit-quit";
import { tallyHabitTrace } from "@/features/habit/lib/habit-trace";
import { cn } from "@/lib/utils";

function formatToday(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function Stat({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Con số chuỗi và khối "Hôm nay" dùng chung một trạng thái ghi dấu. */
export function HabitStreakPanel({
  overview,
}: {
  overview: HabitOverviewItemEnvelope;
}) {
  const { habit: item, trace, date, timeZone } = overview;
  const { isActive } = useEditedHabit();
  const router = useRouter();
  const [checked, setChecked] = useOptimistic(item.checkedInToday);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const isQuit = item.type === "QUIT";
  // Ghi dấu ngày không có lịch không cộng chuỗi (BR-HAB3-006).
  const streak =
    item.currentStreak +
    (item.dueToday ? Number(checked) - Number(item.checkedInToday) : 0);
  const { done, missed } = tallyHabitTrace(trace);

  const toggle = () => {
    setMessage(undefined);
    startTransition(async () => {
      setChecked(!checked);
      try {
        const result = await changeHabitCheckIn({
          id: item.id,
          action: checked ? "undo" : "check-in",
        });
        if (result.status === "error") {
          setMessage(result.message);
          return;
        }
      } catch {
        setMessage("Không thể ghi dấu lúc này. Thử lại sau.");
        return;
      }
      router.refresh();
    });
  };

  const headline = isQuit
    ? "Mỗi ngày giữ được là một ngày."
    : checked
      ? item.checkedInAt && item.checkedInToday
        ? `Đã ghi dấu lúc ${formatCheckInTime(item.checkedInAt, timeZone)}.`
        : "Đã ghi dấu hôm nay."
      : item.dueToday
        ? "Hôm nay có lịch."
        : item.nextDueOn
          ? `Hôm nay nghỉ, buổi tới ${formatNextDue(item.nextDueOn, date)}.`
          : "Hôm nay không có lịch.";

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
              {item.quitStartedAt ? (
                <Stat>
                  Tính từ{" "}
                  <strong className="font-semibold text-foreground">
                    {formatQuitStartedAt(item.quitStartedAt)}
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
            Hôm nay · {formatToday(date)}
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
