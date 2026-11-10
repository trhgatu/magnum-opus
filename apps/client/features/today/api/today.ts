import "server-only";

import type { ForgeTodayResponse, OnThisDayResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

export function getToday(): Promise<ForgeTodayResponse> {
  return apiFetch<ForgeTodayResponse>("/forge/today");
}

/** Ký ức và trang nhật ký của đúng ngày này ở các năm trước. */
export function getOnThisDay(): Promise<OnThisDayResponse> {
  return apiFetch<OnThisDayResponse>("/reflection/on-this-day");
}
