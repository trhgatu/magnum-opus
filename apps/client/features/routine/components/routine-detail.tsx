import type { RoutineDetailResponse } from "@repo/contracts";
import { ArrowLeft, ListChecks, Pencil } from "lucide-react";
import Link from "next/link";

import { ContextHero } from "@/components/system/context-hero";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RoutineHabitManager } from "@/features/routine/components/routine-habit-manager";
import { RoutineLifecycleControls } from "@/features/routine/components/routine-lifecycle-controls";

export function RoutineDetail({ routine }: { routine: RoutineDetailResponse }) {
  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link
        href="/routines"
        className={buttonVariants({
          variant: "ghost",
          className: "self-start",
        })}
      >
        <ArrowLeft aria-hidden="true" /> Tất cả Routine
      </Link>

      <ContextHero
        icon={ListChecks}
        eyebrow="Forge · Routine"
        title={routine.title}
        description="Một trình tự có chủ ý: mỗi Habit là một bước, mỗi bước hoàn thành mở đường cho bước kế tiếp."
        meta={
          <>
            <Badge variant="outline">{routine.habits.length} Habit</Badge>
            <Badge variant={routine.isActive ? "outline" : "secondary"}>
              {routine.isActive ? "Đang rèn luyện" : "Đã lưu trữ"}
            </Badge>
          </>
        }
        actions={
          <>
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
          </>
        }
      />

      <Card className="gap-0 rounded-3xl bg-card/65 py-0 shadow-sm">
        <CardHeader className="border-b px-5 py-5 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Ritual sequence
          </p>
        </CardHeader>
        <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
          <RoutineHabitManager routine={routine} />
        </CardContent>
      </Card>

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
