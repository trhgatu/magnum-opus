import type { HabitOverviewItemEnvelope, HabitResponse } from "@repo/contracts";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import {
  HabitDetailActions,
  HabitDetailDescription,
  HabitDetailMeta,
  HabitDetailTitle,
  HabitEditProvider,
} from "@/features/habit/components/habit-edit-sheet";
import { HabitStreakPanel } from "@/features/habit/components/habit-streak-panel";
import { HabitTraceGrid } from "@/features/habit/components/habit-trace-grid";

export function HabitDetail({
  habit,
  overview,
}: {
  habit: HabitResponse;
  overview: HabitOverviewItemEnvelope;
}) {
  const isQuit = habit.type === "QUIT";

  return (
    <article
      className="flex w-full flex-col gap-8"
      aria-labelledby="habit-title"
    >
      <Link
        href="/habits"
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> Tất cả thói quen
      </Link>

      <HabitEditProvider key={habit.id} initialHabit={habit}>
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-2.5">
            <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
              Forge · Thói quen
            </p>
            <h1
              id="habit-title"
              className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] text-balance sm:text-[46px]"
            >
              <HabitDetailTitle />
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-[17px]">
              <HabitDetailDescription
                placeholder={
                  isQuit
                    ? "Một nỗ lực từ bỏ đang được theo dõi từng ngày."
                    : "Một hành động nhỏ đang được rèn thành nhịp sống có chủ ý."
                }
              />
            </p>
            <div className="flex flex-wrap gap-2">
              <HabitDetailMeta />
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <HabitDetailActions />
          </div>
        </header>

        <HabitStreakPanel overview={overview} />
      </HabitEditProvider>

      <HabitTraceGrid type={habit.type} trace={overview.trace} />
    </article>
  );
}
