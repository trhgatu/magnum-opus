"use client";

import type { GitHubConnectionResponse } from "@repo/contracts";
import { useEffect, useState } from "react";

import { nextHealthChangeAt } from "@/features/github/lib/github-connection";

/** setTimeout tối đa ~24,8 ngày; mốc xa hơn thì hẹn lại giữa chừng. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * "Bây giờ", cập nhật đúng lúc trạng thái hiển thị của kết nối đổi (bắt đầu
 * nhắc, hết hạn) — trang mở lâu không giữ trạng thái cũ.
 */
export function useConnectionNow(
  connection: GitHubConnectionResponse | null,
): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const next = connection ? nextHealthChangeAt(connection, now) : null;
    if (!next) return;
    const timer = setTimeout(
      () => setNow(new Date()),
      Math.min(next.getTime() - Date.now() + 1, MAX_TIMEOUT_MS),
    );
    return () => clearTimeout(timer);
  }, [connection, now]);

  return now;
}
