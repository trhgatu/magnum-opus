import type { HabitOverviewItemResponse } from "@repo/contracts";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import {
  holdingHighlights,
  relapsedToday as isRelapsedToday,
} from "@/features/today/lib/today-plan";
import { cn } from "@/lib/utils";

/**
 * "Đang giữ": thói quen Từ bỏ thành một hàng chip ngay dưới lời chào, để con
 * số ngày giữ được là thứ nhìn thấy đầu tiên, mà không chen vào việc cần làm.
 * Tái phạm hôm nay thì chip chỉ còn viền, như ngày bỏ lỡ: không phải lỗi.
 * Chỉ vài chip đáng nhắc nhất, phần còn lại là một link sang tab Từ bỏ, để
 * hàng này luôn gọn một dòng dù có bao nhiêu thói quen.
 */
export function TodayHolding({
  habits,
}: {
  habits: readonly HabitOverviewItemResponse[];
}) {
  const { shown, more } = holdingHighlights(habits);
  if (shown.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Đang giữ
      </span>
      <ul className="flex flex-wrap gap-2">
        {shown.map((habit) => {
          const relapsedToday = isRelapsedToday(habit);
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
        {more > 0 ? (
          <li>
            <Link
              href="/habits?type=QUIT"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +{more} khác <span className="sr-only">thói quen từ bỏ</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
