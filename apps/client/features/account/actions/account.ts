"use server";

import { revalidatePath } from "next/cache";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";

export type TimeZoneMutationResult =
  { status: "success"; timeZone: string } | MutationError;

export async function updateMyTimeZone(
  timeZone: string,
): Promise<TimeZoneMutationResult> {
  const value = timeZone.trim();
  if (!value || value.length > 64) {
    return { status: "error", message: "Múi giờ không hợp lệ" };
  }

  let saved: { timeZone: string };

  try {
    saved = await apiFetch<{ timeZone: string }>("/users/me/time-zone", {
      method: "PATCH",
      body: JSON.stringify({ timeZone: value }),
    });
  } catch (error) {
    return toMutationError(error);
  }
  // Hôm nay, Thói quen, Chronicle… đều tính theo múi giờ — làm mới cả app.
  revalidatePath("/", "layout");
  return { status: "success", timeZone: saved.timeZone };
}
