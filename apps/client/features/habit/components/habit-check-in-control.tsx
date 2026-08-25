"use client";

import type { HabitCheckInTodayResponse } from "@repo/contracts";
import { Check, Undo2 } from "lucide-react";
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
    <div className="space-y-3" aria-live="polite" aria-busy={isPending}>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        size="lg"
        variant={today.checkedIn ? "outline" : "default"}
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
      <p className="text-xs text-muted-foreground">
        Ngày nghiệp vụ: {today.date}
      </p>
    </div>
  );
}
