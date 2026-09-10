"use client";

import type { HabitProgressResponse } from "@repo/contracts";
import { ShieldAlert, ShieldCheck } from "lucide-react";
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
import { logHabitRelapse } from "@/features/habit/actions/habit";

export function HabitRelapseControl({
  habitId,
  initialProgress,
  disabled = false,
}: {
  habitId: string;
  initialProgress: HabitProgressResponse;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [message, setMessage] = useState<string>();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirmRelapse = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setMessage(undefined);
    startTransition(async () => {
      const result = await logHabitRelapse(habitId);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      if (result.progress) {
        setProgress(result.progress);
      }
      setOpen(false);
      router.refresh();
    });
  };

  const errorAlert = message ? (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;

  return (
    <div className="space-y-5" aria-live="polite" aria-busy={isPending}>
      {!open ? errorAlert : null}
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums">
            {progress.daysSince}
          </p>
          <p className="text-sm text-muted-foreground">ngày không tái phạm</p>
        </div>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return;
          setOpen(next);
          if (next) setMessage(undefined);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            disabled={disabled || isPending}
          >
            <ShieldAlert aria-hidden="true" />
            Tôi đã tái phạm
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đã tái phạm?</AlertDialogTitle>
            <AlertDialogDescription>
              Số ngày không tái phạm sẽ về 0, tính từ thời điểm này. Hành động
              này được ghi lại vĩnh viễn và không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {open ? errorAlert : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={confirmRelapse}
            >
              {isPending ? "Đang ghi nhận…" : "Xác nhận tái phạm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
