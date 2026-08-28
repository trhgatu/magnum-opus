export const ROUTINE_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const ROUTINE_SORT_FIELDS = ["title", "createdAt", "updatedAt"] as const;
export const ROUTINE_SORT_ORDERS = ["asc", "desc"] as const;

export const DEFAULT_ROUTINE_SORT_FIELD = "updatedAt";
export const DEFAULT_ROUTINE_SORT_ORDER = "desc";

export type RoutineStatus = (typeof ROUTINE_STATUSES)[number];
export type RoutineSortField = (typeof ROUTINE_SORT_FIELDS)[number];
export type RoutineSortOrder = (typeof ROUTINE_SORT_ORDERS)[number];

export interface RoutineLocation {
  page?: number;
  search?: string;
  status?: RoutineStatus;
  sortBy?: RoutineSortField;
  sortOrder?: RoutineSortOrder;
}

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseRoutineLocation(params: SearchParams) {
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
      : "ACTIVE") as RoutineStatus,
    sortBy: ROUTINE_SORT_FIELDS.includes(sortCandidate as RoutineSortField)
      ? (sortCandidate as RoutineSortField)
      : DEFAULT_ROUTINE_SORT_FIELD,
    sortOrder: (orderCandidate === "asc" ? "asc" : "desc") as RoutineSortOrder,
  };
}

export function buildRoutineHref(input: RoutineLocation = {}) {
  const params = new URLSearchParams();

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  if (input.search?.trim()) {
    params.set("search", input.search.trim());
  }

  if (input.status === "ARCHIVED") {
    params.set("status", "ARCHIVED");
  }

  if (input.sortBy && input.sortBy !== DEFAULT_ROUTINE_SORT_FIELD) {
    params.set("sortBy", input.sortBy);
  }

  if (input.sortOrder && input.sortOrder !== DEFAULT_ROUTINE_SORT_ORDER) {
    params.set("sortOrder", input.sortOrder);
  }

  const query = params.toString();

  return query ? `/routines?${query}` : "/routines";
}
