"use client";

import { Download, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ConflictAlertProps {
  title: string;
  description: string;
  busy: boolean;
  recoveryError?: string;
  onUseLatest: () => void;
  onKeepLocal: () => void;
}

export function ConflictAlert({
  title,
  description,
  busy,
  recoveryError,
  onUseLatest,
  onKeepLocal,
}: ConflictAlertProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle role="heading" aria-level={2}>
        {title}
      </AlertTitle>

      <AlertDescription>{description}</AlertDescription>

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
