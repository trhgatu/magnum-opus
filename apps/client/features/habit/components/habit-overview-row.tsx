"use client";

import type { HabitOverviewItemResponse } from "@repo/contracts";
import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useHabitCheckIn } from "@/features/habit/hooks/use-habit-check-in";
import { HABIT_DAY_MARK_CLASSES } from "@/features/habit/lib/habit-day-mark";
import { describeLastSevenDays } from "@/features/habit/lib/habit-overview";
import { cn } from "@/lib/utils";

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
            HABIT_DAY_MARK_CLASSES[day.mark],
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

let focusAfterMove: string | null = null;

export function HabitOverviewRow({
  habit,
  description,
}: {
  habit: HabitOverviewItemResponse;
  description: string;
}) {
  const ringRef = useRef<HTMLButtonElement>(null);
  const { checked, streak, withToday, message, isPending, toggle } =
    useHabitCheckIn(habit, {
      onBeforeRefresh: () => {
        if (ringRef.current === document.activeElement) {
          focusAfterMove = habit.id;
        }
      },
    });
  const isQuit = habit.type === "QUIT";
  const lit = checked || isQuit;

  // Ghi dấu xong dòng chuyển nhóm và được dựng lại: trả focus về vòng, hoặc
  // về tiêu đề nhóm nếu dòng vừa vào một nhóm đang gập.
  useEffect(() => {
    if (focusAfterMove !== habit.id) return;
    focusAfterMove = null;
    const fold = ringRef.current?.closest("details");
    if (fold && !fold.open) fold.querySelector("summary")?.focus();
    else ringRef.current?.focus();
  }, [habit.id]);

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
          ref={ringRef}
          aria-label={`Ghi dấu ${habit.title}`}
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
          habit={{
            type: habit.type,
            lastSevenDays: withToday(habit.lastSevenDays),
          }}
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
            {streak}
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
