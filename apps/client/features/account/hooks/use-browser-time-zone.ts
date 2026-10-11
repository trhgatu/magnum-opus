"use client";

import { useSyncExternalStore } from "react";
import { getBrowserTimeZone } from "@/features/account/lib/time-zone";

const subscribe = () => () => {};

/**
 * null khi render trên server (server không biết máy người dùng ở đâu),
 * giá trị thật sau khi hydrate — không gây lệch markup giữa server/client.
 */
export function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(subscribe, getBrowserTimeZone, () => null);
}
