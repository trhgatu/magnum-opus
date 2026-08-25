import type {
  HabitCheckInHistoryResponse,
  HabitCheckInTodayResponse,
  HabitResponse,
} from "@repo/contracts";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { HabitCheckInControl } from "@/features/habit/components/habit-check-in-control";
import { HabitHeatmap } from "@/features/habit/components/habit-heatmap";
import { HabitLifecycleControls } from "@/features/habit/components/habit-lifecycle-controls";
import { formatHabitFrequency } from "@/features/habit/lib/habit-frequency";

export function HabitDetail({
  habit,
  today,
  history,
}: {
  habit: HabitResponse;
  today: HabitCheckInTodayResponse;
  history: HabitCheckInHistoryResponse;
}) {
  return (
    <article className="space-y-8">
      <header className="space-y-5">
        <Link href="/habits" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft aria-hidden="true" /> Tất cả thói quen
        </Link>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>
                {formatHabitFrequency(habit.frequencyType, habit.frequencyDays)}
              </Badge>
              {!habit.isActive ? (
                <Badge variant="secondary">Đã lưu trữ</Badge>
              ) : null}
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              {habit.title}
            </h1>
            {habit.description ? (
              <p className="max-w-2xl leading-7 text-muted-foreground">
                {habit.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {habit.isActive ? (
              <Link
                href={`/habits/${habit.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil aria-hidden="true" /> Chỉnh sửa
              </Link>
            ) : null}
            <HabitLifecycleControls
              id={habit.id}
              isActive={habit.isActive}
              revision={habit.revision}
            />
          </div>
        </div>
      </header>
      <section className="rounded-2xl border bg-card/60 p-6">
        <HabitCheckInControl
          habitId={habit.id}
          initialToday={today}
          disabled={!habit.isActive}
        />
      </section>
      <section className="rounded-2xl border bg-card/40 p-6">
        <HabitHeatmap history={history} />
      </section>
    </article>
  );
}
