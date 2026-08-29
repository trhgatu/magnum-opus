"use client";

import type { RoutineResponse } from "@repo/contracts";
import { ArrowRight, ListChecks, Save } from "lucide-react";
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
            ? "Trình tự đã thay đổi ở nơi khác. Tải lại trang trước khi lưu tiếp."
            : result.message,
        );
        return;
      }

      router.push(`/routines/${result.routine.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={isPending}>
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <section className="overflow-hidden rounded-3xl bg-card/70 shadow-sm ring-1 ring-foreground/10">
        <header className="border-b px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <ListChecks className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">
                Định danh trình tự
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Một tên ngắn, gợi đúng khoảnh khắc Trình tự sẽ được thực hiện.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-3 px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="routine-title">Tên Trình tự</Label>
            <span className="font-mono text-[11px] text-muted-foreground">
              {title.length}/200
            </span>
          </div>
          <Input
            id="routine-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
            disabled={isPending}
            placeholder="Ví dụ: Khởi động ngày mới"
            className="h-12 text-base"
            autoFocus
          />

          {!initialRoutine ? (
            <div className="mt-5 flex gap-3 rounded-2xl border border-dashed bg-muted/30 p-4 text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                02
              </span>
              <p className="leading-6 text-muted-foreground">
                Sau khi tạo, các Thói quen sẽ được chọn và sắp xếp trong trang
                chi tiết để hình thành trình tự hoàn chỉnh.
              </p>
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t bg-muted/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Link
            href={
              initialRoutine ? `/routines/${initialRoutine.id}` : "/routines"
            }
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Hủy
          </Link>
          <Button type="submit" size="lg" disabled={isPending}>
            {initialRoutine ? (
              <Save aria-hidden="true" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
            {isPending
              ? "Đang lưu…"
              : initialRoutine
                ? "Lưu thay đổi"
                : "Tạo Trình tự"}
          </Button>
        </footer>
      </section>
    </form>
  );
}
