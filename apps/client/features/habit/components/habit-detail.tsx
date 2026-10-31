import type {
  HabitCheckInHistoryResponse,
  HabitCheckInTodayResponse,
  HabitProgressResponse,
  HabitResponse,
} from "@repo/contracts";
import { ArrowLeft, CalendarCheck2, Repeat2 } from "lucide-react";
import Link from "next/link";

import { ContextHero } from "@/components/system/context-hero";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HabitCheckInControl } from "@/features/habit/components/habit-check-in-control";
import { HabitHeatmap } from "@/features/habit/components/habit-heatmap";
import {
  HabitDetailActions,
  HabitDetailMeta,
  HabitDetailDescription,
  HabitDetailTitle,
  HabitEditProvider,
} from "@/features/habit/components/habit-edit-sheet";
import { HabitRelapseControl } from "@/features/habit/components/habit-relapse-control";

type HabitDetailProps =
  | {
      habit: HabitResponse;
      today: HabitCheckInTodayResponse;
      history: HabitCheckInHistoryResponse;
      progress?: never;
    }
  | {
      habit: HabitResponse;
      progress: HabitProgressResponse;
      today?: never;
      history?: never;
    };

export function HabitDetail(props: HabitDetailProps) {
  const { habit } = props;
  const isQuit = props.progress !== undefined;

  return (
    <article
      className="flex w-full flex-col gap-6"
      aria-labelledby="habit-title"
    >
      <Link
        href="/habits"
        className={buttonVariants({
          variant: "ghost",
          className: "self-start",
        })}
      >
        <ArrowLeft aria-hidden="true" /> Tất cả thói quen
      </Link>

      <HabitEditProvider
        key={`${habit.id}-${habit.revision}`}
        initialHabit={habit}
      >
        <ContextHero
          id="habit-title"
          icon={Repeat2}
          eyebrow="Forge · Thói quen"
          title={<HabitDetailTitle />}
          description={
            <HabitDetailDescription
              placeholder={
                isQuit
                  ? "Một nỗ lực từ bỏ đang được theo dõi từng ngày."
                  : "Một hành động nhỏ đang được rèn thành nhịp sống có chủ ý."
              }
            />
          }
          meta={<HabitDetailMeta />}
          actions={<HabitDetailActions />}
        />
      </HabitEditProvider>

      {isQuit ? (
        <Card className="gap-0 rounded-3xl bg-card/70 py-0 shadow-sm">
          <CardHeader className="border-b px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                <CalendarCheck2 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Từ bỏ
                </p>
                <h2 className="font-display text-xl font-semibold">
                  Tiến độ từ bỏ
                </h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-6 sm:px-6">
            <HabitRelapseControl
              habitId={habit.id}
              initialProgress={props.progress}
              disabled={!habit.isActive}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="gap-0 rounded-3xl bg-card/70 py-0 shadow-sm">
            <CardHeader className="border-b px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <CalendarCheck2 className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Hằng ngày
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
                initialToday={props.today}
                disabled={!habit.isActive}
              />
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-3xl bg-card/60 py-0 shadow-sm">
            <CardContent className="px-5 py-6 sm:px-6">
              <HabitHeatmap history={props.history} />
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="flex flex-wrap justify-end gap-2 border-t pt-4 font-mono text-xs text-muted-foreground">
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
