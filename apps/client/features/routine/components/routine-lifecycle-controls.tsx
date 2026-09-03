"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";

import { LifecycleErrorAlert } from "@/components/system/lifecycle-error-alert";
import { Button } from "@/components/ui/button";
import { changeRoutineState } from "@/features/routine/actions/routine";
import { notifySuccess } from "@/lib/toast";

const ROUTINE_REVISION_CONFLICT = "ROUTINE_REVISION_CONFLICT";

const isRevisionConflict = (code?: string) =>
  code === ROUTINE_REVISION_CONFLICT;

type RoutineLifecycleControlsProps = {
  id: string;
  title: string;
  isActive: boolean;
  revision: number;
};

type LifecycleError = {
  message: string;
  code?: string;
};

export function RoutineLifecycleControls({
  id,
  title,
  isActive,
  revision,
}: RoutineLifecycleControlsProps) {
  const router = useRouter();

  const [error, setError] = useState<LifecycleError | null>(null);
  const hasConflict = isRevisionConflict(error?.code);

  const [isPending, startTransition] = useTransition();

  const action = isActive ? "archive" : "restore";

  const reloadLatestRevision = () => {
    setError(null);
    router.refresh();
  };

  const runLifecycleAction = () => {
    setError(null);

    startTransition(async () => {
      try {
        const result = await changeRoutineState({
          id,
          expectedRevision: revision,
          action,
        });

        if (result.status === "error") {
          setError({
            code: result.code,
            message: isRevisionConflict(result.code)
              ? "Nếp sinh hoạt đã thay đổi ở một phiên làm việc khác."
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
      } catch {
        setError({
          message: "Không thể cập nhật Nếp sinh hoạt. Vui lòng thử lại.",
        });
      }
    });
  };

  return (
    <div
      role="group"
      className="space-y-2"
      aria-busy={isPending}
      aria-label="Thao tác vòng đời Nếp sinh hoạt"
    >
      {error ? (
        <LifecycleErrorAlert
          message={error.message}
          hasConflict={hasConflict}
          onReload={reloadLatestRevision}
        />
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
