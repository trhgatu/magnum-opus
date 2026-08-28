import type { RoutineDetailResponse } from "@repo/contracts";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RoutineHabitManager } from "@/features/routine/components/routine-habit-manager";
import { RoutineLifecycleControls } from "@/features/routine/components/routine-lifecycle-controls";

export function RoutineDetail({ routine }: { routine: RoutineDetailResponse }) {
  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <header className="space-y-5">
        <Link href="/routines" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft aria-hidden="true" /> Tất cả Routine
        </Link>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{routine.habits.length} Habit</Badge>
              {!routine.isActive ? (
                <Badge variant="secondary">Đã lưu trữ</Badge>
              ) : null}
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance">
              {routine.title}
            </h1>
            <p className="max-w-2xl leading-7 text-muted-foreground">
              Một trình tự có chủ ý, được tạo thành từ những Habit có thể thực
              hiện lần lượt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {routine.isActive ? (
              <Link
                href={`/routines/${routine.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil aria-hidden="true" /> Chỉnh sửa
              </Link>
            ) : null}
            <RoutineLifecycleControls
              id={routine.id}
              isActive={routine.isActive}
              revision={routine.revision}
            />
          </div>
        </div>
      </header>
      <div className="rounded-2xl border bg-card/45 p-5 shadow-sm sm:p-6">
        <RoutineHabitManager routine={routine} />
      </div>
      <footer className="flex flex-wrap justify-between gap-2 border-t pt-4 font-mono text-xs text-muted-foreground">
        <span>Revision {routine.revision}</span>
        <time dateTime={routine.updatedAt}>
          Cập nhật{" "}
          {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
            new Date(routine.updatedAt),
          )}
        </time>
      </footer>
    </article>
  );
}
