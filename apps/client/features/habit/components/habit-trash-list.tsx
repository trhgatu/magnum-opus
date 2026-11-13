"use client";

import type { HabitResponse } from "@repo/contracts";
import { RotateCcw, ShieldOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState, useTransition } from "react";

import { LifecycleErrorAlert } from "@/components/system/lifecycle-error-alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  changeHabitState,
  deleteHabitPermanently,
} from "@/features/habit/actions/habit";
import { describeArchivedHabit } from "@/features/habit/components/habit-archived-list";
import { notifySuccess } from "@/lib/toast";

type ItemError = { message: string; code?: string };

const isRevisionConflict = (code?: string) =>
  code === "HABIT_REVISION_CONFLICT";

const toItemError = (error: ItemError): ItemError =>
  isRevisionConflict(error.code)
    ? { ...error, message: "Thói quen đã thay đổi ở một phiên làm việc khác." }
    : error;

/**
 * Habit trong Thùng rác không có trang chi tiết (BR-HAB4-002), nên khôi
 * phục và xóa vĩnh viễn nằm ngay trên từng dòng.
 */
export function HabitTrashList({
  habits,
}: {
  habits: readonly HabitResponse[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {habits.map((habit) => (
        <HabitTrashItem key={habit.id} habit={habit} />
      ))}
    </ul>
  );
}

function HabitTrashItem({ habit }: { habit: HabitResponse }) {
  const router = useRouter();
  const [error, setError] = useState<ItemError | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reloadLatestRevision = () => {
    setError(null);
    setDeleteOpen(false);
    router.refresh();
  };

  const restore = () => {
    setError(null);
    startTransition(async () => {
      const result = await changeHabitState({
        id: habit.id,
        expectedRevision: habit.revision,
        action: "untrash",
      });
      if (result.status === "error") {
        setError(toItemError(result));
        return;
      }
      void notifySuccess(`Đã khôi phục "${habit.title}"`);
      router.refresh();
    });
  };

  const deletePermanently = (event: MouseEvent<HTMLButtonElement>) => {
    // Giữ hộp thoại mở tới khi có kết quả, để lỗi hiện ngay trong đó.
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await deleteHabitPermanently({
        id: habit.id,
        expectedRevision: habit.revision,
      });
      if (result.status === "error") {
        setError(toItemError(result));
        return;
      }
      setDeleteOpen(false);
      void notifySuccess(`Đã xóa vĩnh viễn "${habit.title}"`);
      router.refresh();
    });
  };

  const errorAlert = error ? (
    <LifecycleErrorAlert
      message={error.message}
      hasConflict={isRevisionConflict(error.code)}
      onReload={reloadLatestRevision}
    />
  ) : null;

  return (
    <li
      className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3.5 sm:px-5"
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-medium">{habit.title}</span>
          <span className="flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
            {habit.type === "QUIT" ? (
              <ShieldOff className="size-3.5" aria-hidden="true" />
            ) : null}
            {describeArchivedHabit(habit)}
          </span>
        </span>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={restore}
            aria-label={`Khôi phục "${habit.title}"`}
          >
            <RotateCcw aria-hidden="true" />
            Khôi phục
          </Button>

          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              if (isPending) return;
              setDeleteOpen(open);
              if (open) setError(null);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                aria-label={`Xóa vĩnh viễn "${habit.title}"`}
              >
                <Trash2 aria-hidden="true" />
                Xóa vĩnh viễn
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Xóa vĩnh viễn &ldquo;{habit.title}&rdquo;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Mọi lần ghi dấu, tái phạm, lịch sử lịch và chỗ của thói quen
                  trong các nếp sinh hoạt sẽ mất theo, và không thể khôi phục.
                  Nếu chỉ muốn dừng lại, hãy khôi phục rồi lưu trữ.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {deleteOpen ? errorAlert : null}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Giữ lại
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isPending}
                  onClick={deletePermanently}
                >
                  {isPending ? "Đang xóa…" : "Xóa vĩnh viễn"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {!deleteOpen ? errorAlert : null}
    </li>
  );
}
