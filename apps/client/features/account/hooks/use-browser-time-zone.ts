"use client";

import { useSyncExternalStore } from "react";

import { getBrowserTimeZone } from "@/features/account/lib/time-zone";

/**
 * Không có sự kiện "đổi múi giờ" trên web, nên đọc lại khi người dùng quay
 * lại tab (focus / hiện lại) — đủ cho trường hợp đổi múi giờ máy hoặc bay
 * sang nơi khác trong lúc trang vẫn mở.
 */
const subscribe = (onChange: () => void) => {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
};

/**
 * null khi render trên server (server không biết máy người dùng ở đâu),
 * giá trị thật sau khi hydrate — không gây lệch markup giữa server/client.
 */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(subscribe, getBrowserTimeZone, () => null);
}
