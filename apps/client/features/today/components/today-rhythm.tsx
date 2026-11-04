import type {
  ForgeTodayResponse,
  HabitOverviewResponse,
} from "@repo/contracts";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { HabitOverviewRow } from "@/features/habit/components/habit-overview-row";
import { describeHabitOverview } from "@/features/habit/lib/habit-overview";
import { routineProgress, todayHabits } from "@/features/today/lib/today-plan";
import { cn } from "@/lib/utils";

const STEP_CLASSES = {
  done: "bg-ember",
  next: "bg-ember-soft",
  todo: "bg-muted",
} as const;

function RoutineCard({
  progress,
}: {
  progress: ReturnType<typeof routineProgress>;
}) {
  const finished = progress.next === null;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-card px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <Link
          href={`/routines/${progress.id}`}
          className="rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {progress.title}
        </Link>
        <span className="font-mono text-xs text-primary tabular-nums">
          {finished ? "Xong" : `Bước ${progress.nextStep} / ${progress.total}`}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${progress.done} trên ${progress.total} bước đã ghi dấu`}
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${progress.total}, minmax(0, 1fr))`,
        }}
      >
        {progress.steps.map((step, index) => (
          <span
            key={index}
            className={cn("h-1.5 rounded-full", STEP_CLASSES[step])}
          />
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground">
        {finished ? "Đã đi hết nếp hôm nay." : `Tiếp theo: ${progress.next}`}
      </p>
    </li>
  );
}

/** Nhịp hôm nay: việc cần ghi dấu, rồi tiến độ của từng Nếp sinh hoạt. */
export function TodayRhythm({
  today,
  overview,
}: {
  today: ForgeTodayResponse;
  overview: HabitOverviewResponse;
}) {
  const habits = todayHabits(today, overview.habits);
  const done = habits.filter((habit) => habit.checkedInToday).length;
  const routines = today.routines
    .map((routine) => routineProgress(routine, overview.habits))
    .filter((routine) => routine.total > 0);
  const context = { today: overview.date, timeZone: overview.timeZone };

  return (
    <section aria-labelledby="today-rhythm" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="today-rhythm"
          className="font-display text-[26px] leading-tight font-medium"
        >
          Nhịp hôm nay
        </h2>
        {habits.length > 0 ? (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {done} / {habits.length} đã ghi dấu
          </span>
        ) : null}
      </div>

      {habits.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => (
            <HabitOverviewRow
              key={habit.id}
              habit={habit}
              description={describeHabitOverview(habit, context)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed px-5 py-6">
          <p className="font-display text-xl">
            {today.emptyReason === "NO_ACTIVE_HABITS"
              ? "Chưa có thói quen nào đang rèn."
              : "Hôm nay không có lịch nào. Một ngày để thở."}
          </p>
          {today.emptyReason === "NO_ACTIVE_HABITS" ? (
            <Link href="/habits/new" className={buttonVariants()}>
              Tạo thói quen
            </Link>
          ) : null}
        </div>
      )}

      {routines.length > 0 ? (
        <ul aria-label="Nếp sinh hoạt hôm nay" className="flex flex-col gap-3">
          {routines.map((routine) => (
            <RoutineCard key={routine.id} progress={routine} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
