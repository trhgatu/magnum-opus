"use client";

import { Check, Pencil } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/lib/toast";

export type ProjectOutcomeSubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

/** Component thuần UI — không tự biết `id`/`revision`/cách gọi API. Toàn
 * bộ việc đó (đọc revision mới nhất, xếp hàng qua `runExclusive` để không
 * đụng độ với title/description đang lưu cùng lúc, cập nhật lại context
 * dùng chung sau khi thành công) do `ProjectOutcomeEditorInline` cung cấp
 * qua `onSubmit` — tách biệt để không lặp lại logic revision-handling đã
 * có ở `useInlineProjectField`. */
export function ProjectOutcomeEditor({
  intendedOutcome,
  externalUpdateToken,
  onSubmit,
}: {
  intendedOutcome: string | null;
  /** Tăng lên khi có cập nhật project từ bên ngoài (không phải do chính
   * editor này lưu) — dùng để tự đóng + bỏ draft cũ, cùng cơ chế với
   * ProjectInlineTitle/ProjectInlineDescription. */
  externalUpdateToken: number;
  onSubmit: (intendedOutcome: string) => Promise<ProjectOutcomeSubmitResult>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(intendedOutcome ?? "");
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const cancel = () => {
    setValue(intendedOutcome ?? "");
    setIsEditing(false);
    setMessage(undefined);
  };

  // Xem giải thích ở ProjectInlineTitle — đóng editor + bỏ draft khi
  // context vừa nhận project mới từ bên ngoài (không phải tự lưu), tránh
  // gửi đè draft cũ lên dữ liệu vừa tải về.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isEditing) cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUpdateToken]);

  const submit = () => {
    setMessage(undefined);

    startTransition(async () => {
      const result = await onSubmit(value);

      if (result.status === "error") {
        setMessage(result.message);
        return;
      }

      void notifySuccess("Đã cập nhật intended outcome");
      setIsEditing(false);
    });
  };

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          {intendedOutcome ?? "Chưa xác định outcome cho chu kỳ này."}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
        >
          <Pencil aria-hidden="true" />
          {intendedOutcome ? "Sửa" : "Xác định"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Bạn muốn đạt được điều gì trong chu kỳ này?"
        disabled={isPending}
        rows={3}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={cancel}
        >
          Hủy
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending || !value.trim()}
          onClick={submit}
        >
          <Check aria-hidden="true" />
          {isPending ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>
    </div>
  );
}
