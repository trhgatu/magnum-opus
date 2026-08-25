export const HABIT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const HABIT_SORT_FIELDS = ["title", "createdAt", "updatedAt"] as const;
export const HABIT_SORT_ORDERS = ["asc", "desc"] as const;

export const DEFAULT_HABIT_SORT_FIELD = "updatedAt";
export const DEFAULT_HABIT_SORT_ORDER = "desc";

export type HabitStatus = (typeof HABIT_STATUSES)[number];
export type HabitSortField = (typeof HABIT_SORT_FIELDS)[number];
export type HabitSortOrder = (typeof HABIT_SORT_ORDERS)[number];

export interface HabitLocation {
  page?: number;
  search?: string;
  status?: HabitStatus;
  sortBy?: HabitSortField;
  sortOrder?: HabitSortOrder;
}

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseHabitLocation(params: SearchParams) {
  const pageCandidate = Number(firstValue(params.page));
  const statusCandidate = firstValue(params.status);
  const sortCandidate = firstValue(params.sortBy);
  const orderCandidate = firstValue(params.sortOrder);

  return {
    page:
      Number.isInteger(pageCandidate) && pageCandidate > 0 ? pageCandidate : 1,
    search: (firstValue(params.search) ?? "").trim(),
    status: (statusCandidate === "ARCHIVED"
      ? "ARCHIVED"
      : "ACTIVE") as HabitStatus,
    sortBy: HABIT_SORT_FIELDS.includes(sortCandidate as HabitSortField)
      ? (sortCandidate as HabitSortField)
      : DEFAULT_HABIT_SORT_FIELD,
    sortOrder: (orderCandidate === "asc" ? "asc" : "desc") as HabitSortOrder,
  };
}

export function buildHabitHref(input: HabitLocation = {}) {
  const params = new URLSearchParams();

  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.status === "ARCHIVED") params.set("status", "ARCHIVED");
  if (input.sortBy && input.sortBy !== DEFAULT_HABIT_SORT_FIELD)
    params.set("sortBy", input.sortBy);
  if (input.sortOrder && input.sortOrder !== DEFAULT_HABIT_SORT_ORDER)
    params.set("sortOrder", input.sortOrder);

  const query = params.toString();
  return query ? `/habits?${query}` : "/habits";
}
