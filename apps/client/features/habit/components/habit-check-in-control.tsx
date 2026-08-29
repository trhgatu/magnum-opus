"use client";

import type { HabitCheckInTodayResponse } from "@repo/contracts";
import { Check, CircleCheckBig, CircleDashed, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { changeHabitCheckIn } from "@/features/habit/actions/habit";

export function HabitCheckInControl({
  habitId,
  initialToday,
  disabled = false,
}: {
  habitId: string;
  initialToday: HabitCheckInTodayResponse;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [today, setToday] = useState(initialToday);
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const mutate = () => {
    setMessage(undefined);
    startTransition(async () => {
      const result = await changeHabitCheckIn({
        id: habitId,
        action: today.checkedIn ? "undo" : "check-in",
      });
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setToday(result.today);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5" aria-live="polite" aria-busy={isPending}>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center gap-3">
        <span
          className={
            today.checkedIn
              ? "grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"
              : "grid size-12 place-items-center rounded-full border border-dashed text-muted-foreground"
          }
        >
          {today.checkedIn ? (
            <CircleCheckBig className="size-5" aria-hidden="true" />
          ) : (
            <CircleDashed className="size-5" aria-hidden="true" />
          )}
        </span>
        <div>
          <p className="font-medium">
            {today.checkedIn ? "Đã ghi dấu hôm nay" : "Chưa ghi dấu hôm nay"}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            Ngày nghiệp vụ: {today.date}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        variant={today.checkedIn ? "outline" : "default"}
        className="w-full"
        disabled={disabled || isPending}
        onClick={mutate}
      >
        {today.checkedIn ? (
          <Undo2 aria-hidden="true" />
        ) : (
          <Check aria-hidden="true" />
        )}
        {isPending
          ? "Đang cập nhật…"
          : today.checkedIn
            ? "Hoàn tác hôm nay"
            : "Hoàn thành hôm nay"}
      </Button>
    </div>
  );
}
