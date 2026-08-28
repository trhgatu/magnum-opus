"use client";

import type { RoutineDetailResponse } from "@repo/contracts";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
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
    onSuccess?: () => void,
  ) => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await mutation();

      if (result.status === "error") {
        setMessage(
          result.code === "ROUTINE_REVISION_CONFLICT"
            ? "Routine đã thay đổi. Tải lại bản mới nhất trước khi tiếp tục."
            : result.message,
        );
        return;
      }

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
      () => setSelectedHabitId(""),
    );
  };

  return (
    <section className="space-y-5" aria-labelledby="routine-habits-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="routine-habits-heading" className="text-xl font-semibold">
            Trình tự Habit
          </h2>
          <p className="text-sm text-muted-foreground">
            Thứ tự từ trên xuống dưới là thứ tự thực hiện.
          </p>
        </div>
        <Badge variant="outline">{routine.habits.length} Habit</Badge>
      </div>

      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {routine.isActive ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-background/45 p-3 sm:flex-row">
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
            <Plus aria-hidden="true" /> Thêm vào Routine
          </Button>
        </div>
      ) : null}

      {routine.habits.length ? (
        <ol className="space-y-2" aria-busy={isPending}>
          {routine.habits.map((habit, index) => (
            <li
              key={habit.id}
              className="flex items-center gap-3 rounded-xl border bg-card/55 p-3"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{habit.title}</p>
                {!habit.isActive ? (
                  <Badge variant="secondary" className="mt-1">
                    Habit đã lưu trữ
                  </Badge>
                ) : null}
              </div>
              {routine.isActive ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Di chuyển ${habit.title} lên`}
                    disabled={isPending || index === 0}
                    onClick={() =>
                      run(() =>
                        moveRoutineHabit({
                          routineId: routine.id,
                          habitId: habit.id,
                          direction: "up",
                          expectedRevision: routine.revision,
                        }),
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
                      run(() =>
                        moveRoutineHabit({
                          routineId: routine.id,
                          habitId: habit.id,
                          direction: "down",
                          expectedRevision: routine.revision,
                        }),
                      )
                    }
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Gỡ ${habit.title} khỏi Routine`}
                    disabled={isPending}
                    onClick={() =>
                      run(() =>
                        removeRoutineHabit({
                          routineId: routine.id,
                          habitId: habit.id,
                          expectedRevision: routine.revision,
                        }),
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
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Routine này chưa có Habit. Thêm Habit đầu tiên để tạo thành một trình
          tự.
        </p>
      )}
    </section>
  );
}
