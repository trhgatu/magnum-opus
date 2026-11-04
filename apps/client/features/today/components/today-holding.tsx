import type { HabitOverviewItemResponse } from "@repo/contracts";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * "Đang giữ": thói quen Từ bỏ thành một hàng chip ngay dưới lời chào, để con
 * số ngày giữ được là thứ nhìn thấy đầu tiên, mà không chen vào việc cần làm.
 * Tái phạm hôm nay thì chip chỉ còn viền, như ngày bỏ lỡ: không phải lỗi.
 */
export function TodayHolding({
  habits,
}: {
  habits: readonly HabitOverviewItemResponse[];
}) {
  const quitting = habits.filter((habit) => habit.type === "QUIT");
  if (quitting.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Đang giữ
      </span>
      <ul className="flex flex-wrap gap-2">
        {quitting.map((habit) => {
          const relapsedToday = habit.lastSevenDays.at(-1)?.mark === "MISSED";
          return (
            <li key={habit.id}>
              <Link
                href={`/habits/${habit.id}`}
                aria-label={
                  relapsedToday
                    ? `${habit.title}: bắt đầu lại hôm nay`
                    : `${habit.title}: ${habit.currentStreak} ngày không tái phạm`
                }
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  relapsedToday
                    ? "border-[1.5px] border-trace-missed hover:bg-muted"
                    : "bg-ember-soft hover:bg-accent",
                )}
              >
                <ShieldCheck
                  className={cn(
                    "size-4",
                    relapsedToday ? "text-muted-foreground" : "text-primary",
                  )}
                  aria-hidden="true"
                />
                <span className="font-medium">{habit.title}</span>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                {relapsedToday ? (
                  <span className="text-muted-foreground">
                    Bắt đầu lại hôm nay
                  </span>
                ) : (
                  <span className="tabular-nums">
                    <span className="font-display text-base text-primary">
                      {habit.currentStreak}
                    </span>{" "}
                    ngày
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
