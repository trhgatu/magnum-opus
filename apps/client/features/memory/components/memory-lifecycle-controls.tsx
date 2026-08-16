"use client";

import type { MemoryResponse } from "@repo/contracts";
import { RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type MouseEvent, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
  changeMemoryState,
  deleteMemoryPermanently,
  type MemoryLifecycleAction,
} from "@/features/memory/actions/memory";

interface MemoryLifecycleControlsProps {
  id: string;
  state: MemoryResponse["state"];
  revision: number;
}

const isRevisionConflict = (code?: string) =>
  code === "MEMORY_REVISION_CONFLICT";

export function MemoryLifecycleControls({
  id,
  state,
  revision,
}: MemoryLifecycleControlsProps) {
  const router = useRouter();

  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    setDeleteOpen(false);
    router.refresh();
  };

  const runLifecycleAction = (action: MemoryLifecycleAction) => {
    clearError();

    startTransition(async () => {
      const result = await changeMemoryState({
        id,
        action,
        expectedRevision: revision,
      });

      if (result.status === "error") {
        showError(result);
        return;
      }

      if (action === "trash") {
        router.push("/memories?state=TRASHED");
      }

      router.refresh();
    });
  };

  const runPermanentDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    clearError();

    startTransition(async () => {
      const result = await deleteMemoryPermanently({
        id,
        expectedRevision: revision,
      });

      if (result.status === "error") {
        showError(result);
        return;
      }

      setDeleteOpen(false);
      router.replace("/memories?state=TRASHED");
    });
  };

  const errorAlert = message ? (
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
  ) : null;

  return (
    <div
      className="flex flex-col items-end gap-2"
      aria-busy={isPending}
      aria-label="Thao tác vòng đời ký ức"
    >
      {!deleteOpen ? errorAlert : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {state === "ACTIVE" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => runLifecycleAction("trash")}
          >
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            Đưa vào Trash
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => runLifecycleAction("restore")}
            >
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Khôi phục
            </Button>

            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                if (isPending) {
                  return;
                }

                setDeleteOpen(open);

                if (open) {
                  clearError();
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isPending}
                >
                  <Trash2 data-icon="inline-start" aria-hidden="true" />
                  Xóa vĩnh viễn
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa vĩnh viễn ký ức này?</AlertDialogTitle>

                  <AlertDialogDescription>
                    Ký ức sẽ biến mất khỏi Magnum Opus và không thể khôi phục.
                    Chỉ tiếp tục khi nội dung này thực sự không còn cần thiết.
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
                    onClick={runPermanentDelete}
                  >
                    {isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
