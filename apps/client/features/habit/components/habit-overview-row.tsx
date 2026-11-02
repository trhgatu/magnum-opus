"use client";

import type { HabitDayMark, HabitOverviewItemResponse } from "@repo/contracts";
import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import { describeLastSevenDays } from "@/features/habit/lib/habit-overview";
import { cn } from "@/lib/utils";

const MARK_CLASSES: Record<HabitDayMark, string> = {
  DONE: "bg-trace-done",
  MISSED: "border-[1.5px] border-trace-missed",
  REST: "",
  PENDING: "border-[1.5px] border-primary bg-ember-soft",
  UNTRACKED: "",
};

function DayStrip({
  habit,
}: {
  habit: Pick<HabitOverviewItemResponse, "type" | "lastSevenDays">;
}) {
  const lastIndex = habit.lastSevenDays.length - 1;

  return (
    <div
      role="img"
      aria-label={describeLastSevenDays(habit)}
      className="grid grid-cols-7 gap-1"
    >
      {habit.lastSevenDays.map((day, index) => (
        <span
          key={day.date}
          className={cn(
            "grid size-3 place-items-center rounded-[3px] transition-colors duration-300",
            MARK_CLASSES[day.mark],
            index === lastIndex &&
              day.mark === "DONE" &&
              "ring-[1.5px] ring-primary",
          )}
        >
          {day.mark === "REST" ? (
            <span className="size-[3px] rounded-full bg-trace-rest" />
          ) : null}
        </span>
      ))}
    </div>
  );
}

/** Hôm nay trong dải 7 ngày theo trạng thái ghi dấu đang hiển thị. */
function withToday(
  habit: HabitOverviewItemResponse,
  checked: boolean,
): HabitOverviewItemResponse["lastSevenDays"] {
  if (checked === habit.checkedInToday) return habit.lastSevenDays;
  const mark: HabitDayMark = checked
    ? "DONE"
    : habit.dueToday
      ? "PENDING"
      : "REST";
  return habit.lastSevenDays.map((day, index, days) =>
    index === days.length - 1 ? { ...day, mark } : day,
  );
}

export function HabitOverviewRow({
  habit,
  description,
}: {
  habit: HabitOverviewItemResponse;
  description: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useOptimistic(habit.checkedInToday);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const isQuit = habit.type === "QUIT";
  const lit = checked || isQuit;

  const toggle = () => {
    setMessage(undefined);
    startTransition(async () => {
      setChecked(!checked);
      const result = await changeHabitCheckIn({
        id: habit.id,
        action: checked ? "undo" : "check-in",
      });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-4 py-3.5 transition-colors duration-300 sm:px-5",
        checked ? "border-transparent bg-ember-soft" : "bg-card",
      )}
    >
      {isQuit ? (
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground"
        >
          <ShieldOff className="size-4" />
        </span>
      ) : (
        <button
          type="button"
          aria-pressed={checked}
          aria-label={`${checked ? "Hoàn tác" : "Ghi dấu"} ${habit.title}`}
          disabled={isPending}
          onClick={toggle}
          className={cn(
            "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-[background-color,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-progress motion-safe:active:scale-90",
            checked
              ? "bg-ember"
              : habit.dueToday
                ? "border-[1.5px] border-dashed border-trace-missed hover:border-primary"
                : "border-[1.5px] border-border hover:border-primary",
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[18px] stroke-ember-foreground"
            fill="none"
            strokeWidth="2.6"
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
        </button>
      )}

      <Link
        href={`/habits/${habit.id}`}
        className="flex min-w-0 flex-[1_1_14rem] flex-col gap-0.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium hover:underline">{habit.title}</span>
        <span className="text-[13px] leading-5 text-muted-foreground">
          {description}
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <DayStrip
          habit={{ type: habit.type, lastSevenDays: withToday(habit, checked) }}
        />
        <div className="flex w-16 flex-col items-end gap-0.5">
          <span
            className={cn(
              "font-display text-[28px] leading-none tabular-nums transition-colors duration-300",
              lit ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span className="sr-only">
              {isQuit ? "Số ngày không tái phạm: " : "Chuỗi hiện tại: "}
            </span>
            {habit.currentStreak}
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {isQuit ? "ngày" : "chuỗi"}
          </span>
        </div>
      </div>

      {message ? (
        <p role="alert" className="basis-full text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </li>
  );
}
