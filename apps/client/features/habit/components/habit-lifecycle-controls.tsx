"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { LifecycleErrorAlert } from "@/components/system/lifecycle-error-alert";
import { Button } from "@/components/ui/button";
import { changeHabitState, trashHabit } from "@/features/habit/actions/habit";
import { isRedirectError } from "@/lib/next-redirect";
import { notifySuccess } from "@/lib/toast";

const isRevisionConflict = (code?: string) =>
  code === "HABIT_REVISION_CONFLICT";

export function HabitLifecycleControls({
  id,
  title,
  isActive,
  revision,
}: {
  id: string;
  title: string;
  isActive: boolean;
  revision: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  const clearError = () => {
    setMessage(undefined);
    setHasConflict(false);
  };

  const showError = (error: { message: string; code?: string }) => {
    setMessage(error.message);
    setHasConflict(isRevisionConflict(error.code));
  };

  const reloadLatestRevision = () => {
    clearError();
    router.refresh();
  };

  const runLifecycleAction = () => {
    clearError();
    startTransition(async () => {
      const result = await changeHabitState({
        id,
        expectedRevision: revision,
        action: isActive ? "archive" : "restore",
      });

      if (result.status === "error") {
        showError({
          ...result,
          message: isRevisionConflict(result.code)
            ? "Thói quen đã thay đổi ở một phiên làm việc khác."
            : result.message,
        });
        return;
      }

      void notifySuccess(
        isActive ? `Đã lưu trữ "${title}"` : `Đã khôi phục "${title}"`,
      );
      // Ở lại trang chi tiết dù lưu trữ hay khôi phục — component đã tự
      // render đúng theo isActive (badge, nút Lưu trữ/Khôi phục).
      router.refresh();
    });
  };

  const moveToTrash = () => {
    clearError();
    startTransition(async () => {
      try {
        // Chỉ return khi thất bại; thành công thì action redirect sang
        // Thùng rác và nhảy xuống catch dạng lỗi NEXT_REDIRECT.
        const result = await trashHabit({ id, expectedRevision: revision });
        showError({
          ...result,
          message: isRevisionConflict(result.code)
            ? "Thói quen đã thay đổi ở một phiên làm việc khác."
            : result.message,
        });
      } catch (error) {
        if (isRedirectError(error)) {
          await notifySuccess(`Đã chuyển "${title}" vào Thùng rác`).catch(
            () => {},
          );
          throw error;
        }
        showError({
          message:
            "Không thể chuyển thói quen vào Thùng rác. Vui lòng thử lại.",
        });
      }
    });
  };

  return (
    <div
      role="group"
      className="space-y-2"
      aria-busy={isPending}
      aria-label="Thao tác vòng đời thói quen"
    >
      {message ? (
        <LifecycleErrorAlert
          message={message}
          hasConflict={hasConflict}
          onReload={reloadLatestRevision}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={runLifecycleAction}
        >
          {isActive ? (
            <Archive aria-hidden="true" />
          ) : (
            <RotateCcw aria-hidden="true" />
          )}
          {isPending ? "Đang cập nhật…" : isActive ? "Lưu trữ" : "Khôi phục"}
        </Button>
        {/* Thùng rác khôi phục được nên không cần hỏi lại; chỉ xóa vĩnh
            viễn mới cần xác nhận. */}
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={moveToTrash}
        >
          <Trash2 aria-hidden="true" />
          Chuyển vào Thùng rác
        </Button>
      </div>
    </div>
  );
}
