"use client";

import { Clock3 } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateMyTimeZone } from "@/features/account/actions/account";
import { useBrowserTimeZone } from "@/features/account/hooks/use-browser-time-zone";
import { sameTimeZone } from "@/features/account/lib/time-zone";
import { notifySuccess } from "@/lib/toast";

// Lưu múi giờ trình duyệt mà người dùng đã chọn "Giữ nguyên", theo từng tài
// khoản — người khác đăng nhập cùng máy vẫn được hỏi. Máy chuyển sang múi giờ
// khác nữa thì hỏi lại.
const dismissedKey = (userId: string) =>
  `magnum-opus:time-zone-notice-dismissed:${userId}`;

function readDismissed(userId: string): string | null {
  try {
    return window.localStorage.getItem(dismissedKey(userId));
  } catch {
    return null;
  }
}

interface TimeZoneMismatchNoticeProps {
  userId: string;
  accountTimeZone: string;
}

export function TimeZoneMismatchNotice({
  userId,
  accountTimeZone,
}: TimeZoneMismatchNoticeProps) {
  const browserTimeZone = useBrowserTimeZone();
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  if (
    browserTimeZone === null ||
    sameTimeZone(browserTimeZone, accountTimeZone) ||
    // So theo múi giờ chứ không theo chuỗi: lần sau trình duyệt có thể báo
    // cùng múi giờ dưới tên khác (Asia/Saigon / Asia/Ho_Chi_Minh).
    (dismissed !== null && sameTimeZone(dismissed, browserTimeZone))
  ) {
    return null;
  }

  const keep = () => {
    try {
      window.localStorage.setItem(dismissedKey(userId), browserTimeZone);
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
