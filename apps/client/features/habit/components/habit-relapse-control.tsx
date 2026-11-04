"use client";

import { ShieldAlert } from "lucide-react";
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
import { logHabitRelapse } from "@/features/habit/actions/habit";

/**
 * Nút "Tôi đã tái phạm" trong khối Hôm nay. Số ngày không tái phạm nằm ở thẻ
 * chuỗi và lấy lại từ server sau khi ghi (router.refresh()).
 */
export function HabitRelapseControl({
  habitId,
  disabled = false,
}: {
  habitId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
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
      // Đã ghi (không hoàn tác được, BR-HAB2-003): kể cả khi không lấy được
      // progress mới, refresh vẫn đọc lại chuỗi từ server.
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        setOpen(next);
        if (next) setMessage(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={disabled || isPending}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2.5 self-start rounded-full border border-block-foreground/35 px-5 text-sm font-medium text-block-foreground transition-colors hover:bg-block-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-block disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldAlert className="size-4" aria-hidden="true" />
          Tôi đã tái phạm
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận đã tái phạm?</AlertDialogTitle>
          <AlertDialogDescription>
            Số ngày không tái phạm sẽ về 0, tính từ thời điểm này. Hành động này
            được ghi lại vĩnh viễn và không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {message ? (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
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
  );
}
