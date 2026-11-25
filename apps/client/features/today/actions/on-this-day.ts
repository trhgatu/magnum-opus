"use server";

import type { OnThisDayKind, OpenOnThisDayItemRequest } from "@repo/contracts";

import { apiFetch } from "@/lib/api";
import { validId } from "@/lib/validation";

/**
 * Ghi rằng người dùng đã mở một mục của "Ngày này năm xưa": đó là một lần
 * nhìn lại, vườn sáng thêm (BR-GDN-LT-003). Lỗi thì bỏ qua: mở mục vẫn phải
 * chạy dù vườn không ghi được.
 */
export async function openOnThisDayItem(
  kind: OnThisDayKind,
  id: string,
): Promise<void> {
  if (!validId(id) || (kind !== "MEMORY" && kind !== "JOURNAL")) return;
  const body: OpenOnThisDayItemRequest = { kind, id };
  try {
    await apiFetch<void>("/reflection/on-this-day/opened", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {}
}
