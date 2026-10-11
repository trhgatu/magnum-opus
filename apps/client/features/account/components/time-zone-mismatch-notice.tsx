"use client";

import { Clock3 } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateMyTimeZone } from "@/features/account/actions/account";
import { useBrowserTimeZone } from "@/features/account/hooks/use-browser-time-zone";
import { sameTimeZone } from "@/features/account/lib/time-zone";
import { notifySuccess } from "@/lib/toast";

// Lưu múi giờ trình duyệt mà người dùng đã chọn "Giữ nguyên" — máy chuyển
// sang múi giờ khác nữa thì hỏi lại.
const DISMISSED_KEY = "magnum-opus:time-zone-notice-dismissed";

function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

interface TimeZoneMismatchNoticeProps {
  accountTimeZone: string;
}

export function TimeZoneMismatchNotice({
  accountTimeZone,
}: TimeZoneMismatchNoticeProps) {
  const browserTimeZone = useBrowserTimeZone();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  if (
    browserTimeZone === null ||
    sameTimeZone(browserTimeZone, accountTimeZone) ||
    dismissed === browserTimeZone
  ) {
    return null;
  }

  const keep = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, browserTimeZone);
    } catch {
      // Không lưu được (chế độ ẩn danh…) thì chỉ ẩn trong lần xem này.
    }
    setDismissed(browserTimeZone);
  };

  const switchToBrowserZone = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await updateMyTimeZone(browserTimeZone);

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      void notifySuccess(`Đã đổi múi giờ sang ${result.timeZone}`);
    });
  };

  return (
    <Alert>
      <Clock3 aria-hidden="true" />
      <AlertTitle>Múi giờ của tài khoản khác với máy này</AlertTitle>
      <AlertDescription>
        <p>
          Tài khoản đang tính ngày theo múi giờ{" "}
          <strong>{accountTimeZone}</strong>, còn máy này đang ở{" "}
          <strong>{browserTimeZone}</strong>.
        </p>
        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" disabled={isPending} onClick={switchToBrowserZone}>
            Dùng {browserTimeZone}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={keep}
          >
            Giữ nguyên
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
