"use client";

import { Archive, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { changeHabitState } from "@/features/habit/actions/habit";
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

  return (
    <div
      role="group"
      className="space-y-2"
      aria-busy={isPending}
      aria-label="Thao tác vòng đời thói quen"
    >
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>

          {hasConflict ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto justify-start p-0 text-destructive"
              onClick={reloadLatestRevision}
            >
              Tải bản mới nhất
            </Button>
          ) : null}
        </Alert>
      ) : null}
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
    </div>
  );
}
