"use client";

import { Download, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface MemoryConflictAlertProps {
  busy: boolean;
  recoveryError?: string;
  onUseLatest: () => void;
  onKeepLocal: () => void;
}

export function MemoryConflictAlert({
  busy,
  recoveryError,
  onUseLatest,
  onKeepLocal,
}: MemoryConflictAlertProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle role="heading" aria-level={2}>
        Ký ức đã được thay đổi ở nơi khác
      </AlertTitle>

      <AlertDescription>
        Nội dung đang viết vẫn còn nguyên trên màn hình. Chọn bản mới nhất để bỏ
        phần đang viết, hoặc chủ động ghi nội dung này lên revision mới nhất.
      </AlertDescription>

      {recoveryError ? (
        <p className="mt-2 text-sm font-medium">{recoveryError}</p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onUseLatest}
        >
          <Download aria-hidden="true" />
          Dùng bản mới nhất
        </Button>

        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={onKeepLocal}
        >
          <Upload aria-hidden="true" />
          Ghi nội dung đang viết
        </Button>
      </div>
    </Alert>
  );
}
