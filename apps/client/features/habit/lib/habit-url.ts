export const HABIT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export type HabitStatus = (typeof HABIT_STATUSES)[number];

/**
 * Tab Đang rèn không phân trang, không sắp xếp (BA habit v3 DEC-HAB3-001);
 * `page` chỉ dùng ở tab Đã lưu trữ.
 */
export interface HabitLocation {
  page?: number;
  search?: string;
  status?: HabitStatus;
}

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseHabitLocation(params: SearchParams) {
  const pageCandidate = Number(firstValue(params.page));
  const status: HabitStatus =
    firstValue(params.status) === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";

  return {
    page:
      status === "ARCHIVED" &&
      Number.isInteger(pageCandidate) &&
      pageCandidate > 0
        ? pageCandidate
        : 1,
    search: (firstValue(params.search) ?? "").trim(),
    status,
  };
}

export function buildHabitHref(input: HabitLocation = {}) {
  const params = new URLSearchParams();

  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.status === "ARCHIVED") {
    params.set("status", "ARCHIVED");
    if (input.page && input.page > 1) params.set("page", String(input.page));
  }

  const query = params.toString();
  return query ? `/habits?${query}` : "/habits";
}
