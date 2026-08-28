"use client";

import type { RoutineResponse } from "@repo/contracts";
import { Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRoutine,
  updateRoutineTitle,
} from "@/features/routine/actions/routine";

export function RoutineEditor({
  initialRoutine,
}: {
  initialRoutine?: Pick<RoutineResponse, "id" | "title" | "revision">;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialRoutine?.title ?? "");
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(undefined);

    startTransition(async () => {
      const result = initialRoutine
        ? await updateRoutineTitle({
            id: initialRoutine.id,
            title,
            expectedRevision: initialRoutine.revision,
          })
        : await createRoutine({ title });

      if (result.status === "error") {
        setMessage(
          result.code === "ROUTINE_REVISION_CONFLICT"
            ? "Routine đã thay đổi ở nơi khác. Tải lại trang trước khi lưu tiếp."
            : result.message,
        );
        return;
      }

      router.push(`/routines/${result.routine.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6" aria-busy={isPending}>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="routine-title">Tên Routine</Label>
        <Input
          id="routine-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
          disabled={isPending}
          placeholder="Ví dụ: Khởi động ngày mới"
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          Habit sẽ được thêm và sắp xếp trong trang chi tiết sau khi Routine
          được tạo.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={initialRoutine ? `/routines/${initialRoutine.id}` : "/routines"}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Hủy
        </Link>
        <Button type="submit" size="lg" disabled={isPending}>
          <Save aria-hidden="true" />
          {isPending
            ? "Đang lưu…"
            : initialRoutine
              ? "Lưu thay đổi"
              : "Tạo Routine"}
        </Button>
      </div>
    </form>
  );
}
