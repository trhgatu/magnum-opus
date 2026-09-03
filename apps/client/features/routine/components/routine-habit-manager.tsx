"use client";

import type { RoutineDetailResponse } from "@repo/contracts";
import { ArrowDown, ArrowUp, CircleDashed, Plus, Route, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addRoutineHabit,
  moveRoutineHabit,
  removeRoutineHabit,
  type RoutineMutationResult,
} from "@/features/routine/actions/routine";
import { RoutineHabitPicker } from "@/features/routine/components/routine-habit-picker";
import { notifySuccess } from "@/lib/toast";

export function RoutineHabitManager({
  routine,
}: {
  routine: RoutineDetailResponse;
}) {
  const router = useRouter();
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const run = (
    mutation: () => Promise<RoutineMutationResult>,
    successMessage: string,
    onSuccess?: () => void,
  ) => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await mutation();

      if (result.status === "error") {
        setMessage(
          result.code === "ROUTINE_REVISION_CONFLICT"
            ? "Nếp sinh hoạt đã thay đổi. Tải lại bản mới nhất trước khi tiếp tục."
            : result.message,
        );
        return;
      }

      void notifySuccess(successMessage);
      onSuccess?.();
      router.refresh();
    });
  };

  const addSelectedHabit = () => {
    if (!selectedHabitId) return;

    run(
      () =>
        addRoutineHabit({
          routineId: routine.id,
          habitId: selectedHabitId,
          expectedRevision: routine.revision,
        }),
      "Đã thêm Thói quen vào Nếp sinh hoạt",
      () => setSelectedHabitId(""),
    );
  };

  return (
    <section className="space-y-6" aria-labelledby="routine-habits-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border bg-background text-primary">
            <Route className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="routine-habits-heading"
              className="font-display text-2xl font-semibold tracking-tight"
            >
              Thói quen trong Nếp sinh hoạt
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Từ trên xuống dưới là nhịp thực hiện của Nếp sinh hoạt.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="self-start">
          {routine.habits.length} bước
        </Badge>
      </div>

      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {routine.isActive ? (
        <div className="rounded-2xl border border-dashed bg-background/45 p-3 sm:p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Thêm bước mới
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <RoutineHabitPicker
              routineId={routine.id}
              revision={routine.revision}
              value={selectedHabitId}
              onValueChange={setSelectedHabitId}
              disabled={isPending}
            />
            <Button
              type="button"
              onClick={addSelectedHabit}
              disabled={isPending || !selectedHabitId}
            >
              <Plus aria-hidden="true" /> Thêm vào Nếp sinh hoạt
            </Button>
          </div>
        </div>
      ) : null}

      {routine.habits.length ? (
        <ol className="space-y-0" aria-busy={isPending}>
          {routine.habits.map((habit, index) => (
            <li
              key={habit.id}
              className="group/step relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pb-3 last:pb-0"
            >
              {index < routine.habits.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-5 top-11 h-[calc(100%-2.25rem)] w-px bg-border"
                />
              ) : null}
              <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-background font-mono text-xs font-semibold text-primary shadow-sm">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card/70 px-4 py-3 transition-colors group-hover/step:border-primary/25">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{habit.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Bước {index + 1} trong {routine.habits.length}
                  </p>
                </div>
                {!habit.isActive ? (
                  <Badge variant="secondary">Đã lưu trữ</Badge>
                ) : null}
              </div>
              {routine.isActive ? (
                <div className="flex shrink-0 rounded-lg border bg-background/80 p-0.5">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Di chuyển ${habit.title} lên`}
                    disabled={isPending || index === 0}
                    onClick={() =>
                      run(
                        () =>
                          moveRoutineHabit({
                            routineId: routine.id,
                            habitId: habit.id,
                            direction: "up",
                            expectedRevision: routine.revision,
                          }),
                        `Đã di chuyển "${habit.title}" lên`,
                      )
                    }
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Di chuyển ${habit.title} xuống`}
                    disabled={isPending || index === routine.habits.length - 1}
                    onClick={() =>
                      run(
                        () =>
                          moveRoutineHabit({
                            routineId: routine.id,
                            habitId: habit.id,
                            direction: "down",
                            expectedRevision: routine.revision,
                          }),
                        `Đã di chuyển "${habit.title}" xuống`,
                      )
                    }
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Gỡ ${habit.title} khỏi Nếp sinh hoạt`}
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () =>
                          removeRoutineHabit({
                            routineId: routine.id,
                            habitId: habit.id,
                            expectedRevision: routine.revision,
                          }),
                        `Đã gỡ "${habit.title}" khỏi Nếp sinh hoạt`,
                      )
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed bg-background/35 px-6 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <CircleDashed className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 font-display text-lg font-semibold">
            Nếp sinh hoạt chưa được khởi tạo
          </p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Thêm Thói quen đầu tiên để đặt viên đá mở đầu cho Nếp sinh hoạt này.
          </p>
        </div>
      )}
    </section>
  );
}
