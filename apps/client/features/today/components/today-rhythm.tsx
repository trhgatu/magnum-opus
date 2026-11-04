import type {
  ForgeTodayResponse,
  HabitOverviewResponse,
} from "@repo/contracts";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { HabitOverviewRow } from "@/features/habit/components/habit-overview-row";
import { describeHabitOverview } from "@/features/habit/lib/habit-overview";
import {
  type RoutineProgress,
  todayGroups,
  todayHabits,
} from "@/features/today/lib/today-plan";
import { cn } from "@/lib/utils";

const STEP_CLASSES = {
  done: "bg-ember",
  next: "bg-ember-soft",
  todo: "bg-muted",
} as const;

function GroupHeader({ progress }: { progress: RoutineProgress }) {
  const finished = progress.next === null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">
          <Link
            href={`/routines/${progress.id}`}
            className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {progress.title}
          </Link>
        </h3>
        <span className="font-mono text-xs text-primary tabular-nums">
          {finished ? "Xong" : `Bước ${progress.nextStep} / ${progress.total}`}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${progress.done} trên ${progress.total} bước đã ghi dấu${finished ? "" : `, tiếp theo: ${progress.next}`}`}
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
    </div>
  );
}

/** Nhịp hôm nay: việc cần ghi dấu, nhóm theo Nếp sinh hoạt kèm tiến độ. */
export function TodayRhythm({
  today,
  overview,
}: {
  today: ForgeTodayResponse;
  overview: HabitOverviewResponse;
}) {
  const habits = todayHabits(today, overview.habits);
  const done = habits.filter((habit) => habit.checkedInToday).length;
  const groups = todayGroups(today, overview.habits);
  const grouped = groups.some((group) => group.routine !== null);
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
        <div className="flex flex-col gap-7">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              {group.routine ? (
                <GroupHeader progress={group.routine} />
              ) : grouped ? (
                <h3 className="font-medium text-muted-foreground">
                  Thói quen lẻ
                </h3>
              ) : null}
              {group.items.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {group.items.map((habit) => (
                    <HabitOverviewRow
                      key={habit.id}
                      habit={habit}
                      description={describeHabitOverview(habit, context)}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
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
    </section>
  );
}
