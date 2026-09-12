"use client";

import type { ProjectResponse } from "@repo/contracts";
import { Check, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setProjectIntendedOutcome } from "@/features/project/actions/project";
import { notifySuccess } from "@/lib/toast";

export function ProjectOutcomeEditor({
  id,
  revision,
  intendedOutcome,
  onSaved,
}: {
  id: string;
  revision: number;
  intendedOutcome: string | null;
  /** Gọi với project mới nhất ngay khi lưu thành công — để chỗ nào giữ
   * revision dùng chung (vd `ProjectFieldsProvider`) cập nhật ngay, không
   * phải chờ `router.refresh()` round-trip mới thấy revision mới. */
  onSaved?: (project: ProjectResponse) => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(intendedOutcome ?? "");
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const cancel = () => {
    setValue(intendedOutcome ?? "");
    setIsEditing(false);
    setMessage(undefined);
  };

  const submit = () => {
    setMessage(undefined);

    startTransition(async () => {
      const result = await setProjectIntendedOutcome({
        id,
        intendedOutcome: value,
        expectedRevision: revision,
      });

      if (result.status === "error") {
        setMessage(result.message);
        return;
      }

      void notifySuccess("Đã cập nhật intended outcome");
      setIsEditing(false);
      onSaved?.(result.project);
      router.refresh();
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
