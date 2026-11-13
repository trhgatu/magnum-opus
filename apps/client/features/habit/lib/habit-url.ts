import type { HabitType } from "@repo/contracts";

export const HABIT_STATUSES = ["ACTIVE", "ARCHIVED", "TRASHED"] as const;

export type HabitStatus = (typeof HABIT_STATUSES)[number];

/**
 * Đang rèn chia hai tab Xây dựng / Từ bỏ, không phân trang, không sắp xếp
 * (BA habit v3 DEC-HAB3-001); `page` chỉ dùng ở Đã lưu trữ và Thùng rác,
 * nơi không chia theo loại.
 */
export interface HabitLocation {
  page?: number;
  search?: string;
  status?: HabitStatus;
  type?: HabitType;
}

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseHabitLocation(params: SearchParams) {
  const pageCandidate = Number(firstValue(params.page));
  const statusParam = firstValue(params.status);
  const status: HabitStatus =
    statusParam === "ARCHIVED" || statusParam === "TRASHED"
      ? statusParam
      : "ACTIVE";
  const type: HabitType =
    status === "ACTIVE" && firstValue(params.type) === "QUIT"
      ? "QUIT"
      : "BUILD";

  return {
    page:
      status !== "ACTIVE" &&
      Number.isInteger(pageCandidate) &&
      pageCandidate > 0
        ? pageCandidate
        : 1,
    search: (firstValue(params.search) ?? "").trim(),
    status,
    type,
  };
}

export function buildHabitHref(input: HabitLocation = {}) {
  const params = new URLSearchParams();

  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.status === "ARCHIVED" || input.status === "TRASHED") {
    params.set("status", input.status);
    if (input.page && input.page > 1) params.set("page", String(input.page));
  } else if (input.type === "QUIT") {
    params.set("type", "QUIT");
  }

  const query = params.toString();
  return query ? `/habits?${query}` : "/habits";
}
