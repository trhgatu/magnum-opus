"use client";

import { Archive, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { changeRoutineState } from "@/features/routine/actions/routine";

export function RoutineLifecycleControls({
  id,
  isActive,
  revision,
}: {
  id: string;
  isActive: boolean;
  revision: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const run = () => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await changeRoutineState({
        id,
        expectedRevision: revision,
        action: isActive ? "archive" : "restore",
      });

      if (result.status === "error") {
        setMessage(
          result.code === "ROUTINE_REVISION_CONFLICT"
            ? "Routine đã thay đổi. Tải lại bản mới nhất trước khi tiếp tục."
            : result.message,
        );
        return;
      }

      router.push(isActive ? "/routines?status=ARCHIVED" : `/routines/${id}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2" aria-busy={isPending}>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={run}
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
