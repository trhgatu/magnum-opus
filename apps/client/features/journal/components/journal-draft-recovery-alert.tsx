"use client";

import { Check, Clipboard } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

type RecoveryReason = "missing" | "session" | "remote_state";

const recoveryCopy: Record<
  RecoveryReason,
  { title: string; description: string; destination: string }
> = {
  missing: {
    title: "Entry không còn tồn tại trên server",
    description:
      "Phần đang gõ vẫn còn trên màn hình nhưng không thể lưu vào entry này.",
    destination: "Về Nhật ký",
  },
  session: {
    title: "Phiên đăng nhập đã kết thúc",
    description:
      "Sao chép phần đang gõ trước khi đăng nhập lại để không phụ thuộc vào trạng thái của trang này.",
    destination: "Đăng nhập lại",
  },
  remote_state: {
    title: "Entry đã đổi trạng thái ở nơi khác",
    description:
      "Server không còn cho chỉnh sửa entry này. Phần đang gõ vẫn được giữ để sao chép trước khi rời trang.",
    destination: "Về Nhật ký",
  },
};

export const journalDraftText = (title: string, content: string) =>
  title.trim() ? `# ${title.trim()}\n\n${content}` : content;

interface JournalDraftRecoveryAlertProps {
  reason: RecoveryReason;
  entryId: string;
  title: string;
  content: string;
}

export function JournalDraftRecoveryAlert({
  reason,
  entryId,
  title,
  content,
}: JournalDraftRecoveryAlertProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copy = recoveryCopy[reason];
  const destination =
    reason === "session"
      ? `/login?next=${encodeURIComponent(`/journal/${entryId}`)}`
      : "/journal";

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(journalDraftText(title, content));
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle role="heading" aria-level={2}>
        {copy.title}
      </AlertTitle>
      <AlertDescription>{copy.description}</AlertDescription>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyDraft()}
        >
          {copyState === "copied" ? (
            <Check aria-hidden="true" />
          ) : (
            <Clipboard aria-hidden="true" />
          )}
          {copyState === "copied" ? "Đã sao chép" : "Sao chép nội dung"}
        </Button>
        <Link
          href={destination}
          className={buttonVariants({ variant: "outline" })}
        >
          {copy.destination}
        </Link>
      </div>
      {copyState === "error" ? (
        <p className="mt-2 text-sm font-medium">
          Trình duyệt không cho phép sao chép tự động. Hãy chọn nội dung trong
          editor và sao chép thủ công.
        </p>
      ) : null}
    </Alert>
  );
}
