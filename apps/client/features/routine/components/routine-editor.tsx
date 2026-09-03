"use client";

import type { RoutineResponse } from "@repo/contracts";
import { ArrowRight, ListChecks, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { ConflictAlert } from "@/components/system/conflict-alert";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRoutine,
  reloadRoutine,
  updateRoutineTitle,
} from "@/features/routine/actions/routine";
import { notifySuccess } from "@/lib/toast";

type PersistedRoutine = Pick<RoutineResponse, "id" | "title" | "revision">;

export function RoutineEditor({
  initialRoutine,
}: {
  initialRoutine?: PersistedRoutine;
}) {
  const router = useRouter();
  const [persistedRoutine, setPersistedRoutine] = useState(initialRoutine);
  const [title, setTitle] = useState(initialRoutine?.title ?? "");
  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const applyPersistedRoutine = (routine: PersistedRoutine) => {
    setPersistedRoutine(routine);
    setTitle(routine.title);
    setMessage(undefined);
    setHasConflict(false);
    setRecoveryError(undefined);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(undefined);
    setRecoveryError(undefined);

    startTransition(async () => {
      const result = persistedRoutine
        ? await updateRoutineTitle({
            id: persistedRoutine.id,
            title,
            expectedRevision: persistedRoutine.revision,
          })
        : await createRoutine({ title });

      if (result.status === "error") {
        setMessage(result.message);
        setHasConflict(result.code === "ROUTINE_REVISION_CONFLICT");
        return;
      }

      void notifySuccess(
        persistedRoutine
          ? `Đã cập nhật "${result.routine.title}"`
          : `Đã tạo "${result.routine.title}"`,
      );

      router.push(`/routines/${result.routine.id}`);
      router.refresh();
    });
  };

  const resolveConflict = (keepLocal: boolean) => {
    if (!persistedRoutine) {
      return;
    }

    setRecoveryError(undefined);

    startTransition(async () => {
      const latest = await reloadRoutine(persistedRoutine.id);

      if (latest.status === "error") {
        setRecoveryError(latest.message);
        return;
      }

      if (!keepLocal) {
        applyPersistedRoutine(latest.routine);
        return;
      }

      if (!latest.routine.isActive) {
        setPersistedRoutine(latest.routine);
        setHasConflict(false);
        setMessage(
          "Trình tự đã được lưu trữ ở nơi khác. Nội dung đang viết vẫn được giữ trên màn hình để sao chép.",
        );
        return;
      }

      const result = await updateRoutineTitle({
        id: latest.routine.id,
        title,
        expectedRevision: latest.routine.revision,
      });

      if (result.status === "error") {
        setMessage(result.message);
        setHasConflict(result.code === "ROUTINE_REVISION_CONFLICT");
        setRecoveryError(
          result.code === "ROUTINE_REVISION_CONFLICT"
            ? "Trình tự lại thay đổi trong lúc xử lý. Nội dung đang viết vẫn được giữ."
            : result.message,
        );
        return;
      }

      void notifySuccess(`Đã cập nhật "${result.routine.title}"`);

      router.push(`/routines/${result.routine.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={isPending}>
      {hasConflict ? (
        <ConflictAlert
          title="Trình tự đã được thay đổi ở nơi khác"
          description="Nội dung đang viết vẫn còn nguyên trên màn hình. Chọn bản mới nhất để bỏ phần đang viết, hoặc chủ động ghi nội dung này lên revision mới nhất."
          busy={isPending}
          recoveryError={recoveryError}
          onUseLatest={() => resolveConflict(false)}
          onKeepLocal={() => resolveConflict(true)}
        />
      ) : message ? (
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

          {!persistedRoutine ? (
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
              persistedRoutine
                ? `/routines/${persistedRoutine.id}`
                : "/routines"
            }
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Hủy
          </Link>
          <Button type="submit" size="lg" disabled={isPending}>
            {persistedRoutine ? (
              <Save aria-hidden="true" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
            {isPending
              ? "Đang lưu…"
              : persistedRoutine
                ? "Lưu thay đổi"
                : "Tạo Trình tự"}
          </Button>
        </footer>
      </section>
    </form>
  );
}
