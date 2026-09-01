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
import { notifySuccess } from "@/lib/toast";

interface MemoryLifecycleControlsProps {
  id: string;
  title: string;
  state: MemoryResponse["state"];
  revision: number;
}

type LifecycleError = {
  message: string;
  code?: string;
};

const MEMORY_REVISION_CONFLICT = "MEMORY_REVISION_CONFLICT";

const isRevisionConflict = (code?: string) => code === MEMORY_REVISION_CONFLICT;

export function MemoryLifecycleControls({
  id,
  title,
  state,
  revision,
}: MemoryLifecycleControlsProps) {
  const router = useRouter();

  const [error, setError] = useState<LifecycleError | null>(null);
  const hasConflict = isRevisionConflict(error?.code);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reloadLatestRevision = () => {
    setError(null);
    setDeleteOpen(false);
    router.refresh();
  };

  const runLifecycleAction = (action: MemoryLifecycleAction) => {
    setError(null);

    startTransition(async () => {
      try {
        const result = await changeMemoryState({
          id,
          action,
          expectedRevision: revision,
        });

        if (result.status === "error") {
          setError(result);
          return;
        }

        void notifySuccess(
          action === "trash"
            ? `Đã đưa "${title}" vào Thùng rác`
            : `Đã khôi phục "${title}"`,
        );

        if (action === "trash") {
          router.push("/memories?state=TRASHED");
        }
        router.refresh();
      } catch {
        setError({
          message: "Không thể cập nhật ký ức. Vui lòng thử lại.",
        });
      }
    });
  };

  const runPermanentDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await deleteMemoryPermanently({
          id,
          expectedRevision: revision,
        });

        if (result.status === "error") {
          setError(result);
          return;
        }

        void notifySuccess(`Đã xóa vĩnh viễn "${title}"`);

        setDeleteOpen(false);
        router.replace("/memories?state=TRASHED");
      } catch {
        setError({
          message: "Không thể xóa ký ức. Vui lòng thử lại.",
        });
      }
    });
  };

  const errorAlert = error ? (
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
            Đưa vào Thùng rác
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
                  setError(null);
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
