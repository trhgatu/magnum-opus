"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
              ? "Trình tự đã thay đổi ở một phiên làm việc khác."
              : result.message,
          });

          return;
        }

        void notifySuccess(
          isActive ? `Đã lưu trữ "${title}"` : `Đã khôi phục "${title}"`,
        );

        router.push(isActive ? "/routines?status=ARCHIVED" : `/routines/${id}`);
        router.refresh();
      } catch {
        setError({
          message: "Không thể cập nhật trình tự. Vui lòng thử lại.",
        });
      }
    });
  };

  return (
    <div
      className="space-y-2"
      aria-busy={isPending}
      aria-label="Thao tác vòng đời trình tự"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>

          {hasConflict && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-1 h-auto justify-start p-0 text-destructive"
              onClick={reloadLatestRevision}
            >
              Tải bản mới nhất
            </Button>
          )}
        </Alert>
      )}

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
