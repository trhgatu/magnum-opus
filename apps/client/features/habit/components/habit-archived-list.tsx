import type { HabitResponse } from "@repo/contracts";
import { ArrowUpRight, ShieldOff } from "lucide-react";
import Link from "next/link";

import { formatHabitFrequency } from "@/features/habit/lib/habit-frequency";
import { formatQuitStartedAt } from "@/features/habit/lib/habit-quit";

export function describeArchivedHabit(habit: HabitResponse) {
  if (habit.type === "QUIT") {
    return habit.quitStartedAt
      ? `Từ bỏ · tính từ ${formatQuitStartedAt(habit.quitStartedAt)}`
      : "Từ bỏ";
  }
  return formatHabitFrequency(habit.frequencyType, habit.frequencyDays);
}

export function HabitArchivedList({
  habits,
}: {
  habits: readonly HabitResponse[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {habits.map((habit) => (
        <li key={habit.id}>
          <Link
            href={`/habits/${habit.id}`}
            className="group flex items-center gap-4 rounded-2xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{habit.title}</span>
              <span className="flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
                {habit.type === "QUIT" ? (
                  <ShieldOff className="size-3.5" aria-hidden="true" />
                ) : null}
                {describeArchivedHabit(habit)}
              </span>
            </span>
            <ArrowUpRight
              className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
