import type {
  HabitCheckInHistoryResponse,
  HabitCheckInTodayResponse,
  HabitResponse,
} from "@repo/contracts";
import { ArrowLeft, CalendarCheck2, Pencil, Repeat2 } from "lucide-react";
import Link from "next/link";

import { ContextHero } from "@/components/system/context-hero";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/habits"
        className={buttonVariants({
          variant: "ghost",
          className: "self-start",
        })}
      >
        <ArrowLeft aria-hidden="true" /> Tất cả thói quen
      </Link>

      <ContextHero
        icon={Repeat2}
        eyebrow="Forge · Habit"
        title={habit.title}
        description={
          habit.description ??
          "Một hành động nhỏ đang được rèn thành nhịp sống có chủ ý."
        }
        meta={
          <>
            <Badge>
              {formatHabitFrequency(habit.frequencyType, habit.frequencyDays)}
            </Badge>
            <Badge variant={habit.isActive ? "outline" : "secondary"}>
              {habit.isActive ? "Đang rèn luyện" : "Đã lưu trữ"}
            </Badge>
          </>
        }
        actions={
          <>
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
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card className="gap-0 rounded-3xl bg-card/70 py-0 shadow-sm">
          <CardHeader className="border-b px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                <CalendarCheck2 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Daily mark
                </p>
                <h2 className="font-display text-xl font-semibold">
                  Nhịp của hôm nay
                </h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-6 sm:px-6">
            <HabitCheckInControl
              habitId={habit.id}
              initialToday={today}
              disabled={!habit.isActive}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-3xl bg-card/60 py-0 shadow-sm">
          <CardContent className="px-5 py-6 sm:px-6">
            <HabitHeatmap history={history} />
          </CardContent>
        </Card>
      </div>

      <footer className="flex flex-wrap justify-between gap-2 border-t pt-4 font-mono text-xs text-muted-foreground">
        <span>Revision {habit.revision}</span>
        <time dateTime={habit.updatedAt}>
          Cập nhật{" "}
          {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
            new Date(habit.updatedAt),
          )}
        </time>
      </footer>
    </article>
  );
}
