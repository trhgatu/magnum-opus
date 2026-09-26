"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RoutineDetailResponse } from "@repo/contracts";
import {
  ArrowDown,
  ArrowUp,
  CircleDashed,
  GripVertical,
  Plus,
  Route,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addRoutineHabit,
  moveRoutineHabit,
  removeRoutineHabit,
  reorderRoutineHabits,
  type RoutineMutationResult,
} from "@/features/routine/actions/routine";
import { RoutineHabitPicker } from "@/features/routine/components/routine-habit-picker";
import { notifySuccess } from "@/lib/toast";

type RoutineHabit = RoutineDetailResponse["habits"][number];

export function RoutineHabitManager({
  routine,
}: {
  routine: RoutineDetailResponse;
}) {
  const router = useRouter();
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [habits, setHabits] = useState<RoutineHabit[]>(routine.habits);

  // Nguồn sự thật vẫn là server — đồng bộ lại state cục bộ mỗi khi
  // `routine` mới được tải về (sau router.refresh(), hoặc do conflict
  // reload ở field khác), tránh state kéo thả bị lệch với dữ liệu thật.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHabits(routine.habits);
  }, [routine.habits]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const run = (
    mutation: () => Promise<RoutineMutationResult>,
    successMessage: string,
    onSuccess?: () => void,
    onError?: () => void,
  ) => {
    setMessage(undefined);
    startTransition(async () => {
      try {
        const result = await mutation();

        if (result.status === "error") {
          setMessage(
            result.code === "ROUTINE_REVISION_CONFLICT"
              ? "Nếp sinh hoạt đã thay đổi. Tải lại bản mới nhất trước khi tiếp tục."
              : result.message,
          );
          onError?.();
          return;
        }

        void notifySuccess(successMessage);
        onSuccess?.();
        router.refresh();
      } catch {
        setMessage("Không thể lưu, vui lòng thử lại.");
        onError?.();
      }
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = habits.findIndex((habit) => habit.id === active.id);
    const newIndex = habits.findIndex((habit) => habit.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Cập nhật lạc quan ngay khi thả, để danh sách không giật lại vị trí
    // cũ trong lúc chờ request — rollback ở `run()` nếu request lỗi.
    const reordered = arrayMove(habits, oldIndex, newIndex);
    setHabits(reordered);

    run(
      () =>
        reorderRoutineHabits({
          routineId: routine.id,
          habitIds: reordered.map((habit) => habit.id),
          expectedRevision: routine.revision,
        }),
      "Đã sắp xếp lại Nếp sinh hoạt",
      undefined,
      // Không rollback bằng `routine.habits` (prop) — nó có thể đã cũ hơn
      // cả trạng thái thật trên server (vd request khác vừa thành công
      // trước đó nhưng props chưa kịp refresh). Luôn refresh để lấy lại
      // đúng nguồn sự thật từ server thay vì đoán.
      () => router.refresh(),
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
              Từ trên xuống dưới là nhịp thực hiện của Nếp sinh hoạt. Kéo vào
              tay cầm để sắp xếp lại.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="self-start">
          {habits.length} bước
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

      {habits.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={habits.map((habit) => habit.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-0" aria-busy={isPending}>
              {habits.map((habit, index) => (
                <SortableHabitRow
                  key={habit.id}
                  habit={habit}
                  index={index}
                  total={habits.length}
                  isPending={isPending}
                  routineIsActive={routine.isActive}
                  onMoveUp={() =>
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
                  onMoveDown={() =>
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
                  onRemove={() =>
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
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
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

function SortableHabitRow({
  habit,
  index,
  total,
  isPending,
  routineIsActive,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  habit: RoutineHabit;
  index: number;
  total: number;
  isPending: boolean;
  routineIsActive: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id, disabled: !routineIsActive || isPending });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group/step relative grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 pb-3 last:pb-0 ${
        isDragging ? "z-20 opacity-90" : ""
      }`}
    >
      {index < total - 1 ? (
        <span
          aria-hidden="true"
          className="absolute left-5 top-11 h-[calc(100%-2.25rem)] w-px bg-border"
        />
      ) : null}
      <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-background font-mono text-xs font-semibold text-primary shadow-sm">
        {String(index + 1).padStart(2, "0")}
      </span>
      {routineIsActive ? (
        <button
          type="button"
          className="grid size-8 shrink-0 cursor-grab place-items-center rounded-lg border bg-background/80 text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Kéo để sắp xếp lại "${habit.title}"`}
          disabled={isPending}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}
      <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card/70 px-4 py-3 transition-colors group-hover/step:border-primary/25">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{habit.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Bước {index + 1} trong {total}
          </p>
        </div>
        {!habit.isActive ? <Badge variant="secondary">Đã lưu trữ</Badge> : null}
      </div>
      {routineIsActive ? (
        <div className="flex shrink-0 rounded-lg border bg-background/80 p-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Di chuyển ${habit.title} lên`}
            disabled={isPending || index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Di chuyển ${habit.title} xuống`}
            disabled={isPending || index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Gỡ ${habit.title} khỏi Nếp sinh hoạt`}
            disabled={isPending}
            onClick={onRemove}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}
