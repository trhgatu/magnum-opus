import type { MemoryState } from "@repo/contracts";

export const MEMORY_SORT_FIELDS = [
  "occurredOn",
  "createdAt",
  "updatedAt",
] as const;

export const MEMORY_SORT_ORDERS = ["asc", "desc"] as const;

export const DEFAULT_MEMORY_SORT_FIELD = "occurredOn";
export const DEFAULT_MEMORY_SORT_ORDER = "desc";

export type MemorySortField = (typeof MEMORY_SORT_FIELDS)[number];
export type MemorySortOrder = (typeof MEMORY_SORT_ORDERS)[number];

export interface MemoryLocation {
  page?: number;
  search?: string;
  state?: MemoryState;
  sortBy?: MemorySortField;
  sortOrder?: MemorySortOrder;
}

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const positiveIntegerFrom = (value: string | string[] | undefined): number => {
  const candidate = Number(firstValue(value));
  return Number.isInteger(candidate) && candidate > 0 ? candidate : 1;
};

const stateFrom = (
  value: string | string[] | undefined,
): MemoryState | undefined => {
  const candidate = firstValue(value);

  return candidate === "ACTIVE" || candidate === "TRASHED"
    ? candidate
    : undefined;
};

const sortFieldFrom = (
  value: string | string[] | undefined,
): MemorySortField => {
  const candidate = firstValue(value);

  return MEMORY_SORT_FIELDS.includes(candidate as MemorySortField)
    ? (candidate as MemorySortField)
    : DEFAULT_MEMORY_SORT_FIELD;
};

const sortOrderFrom = (
  value: string | string[] | undefined,
): MemorySortOrder => {
  const candidate = firstValue(value);

  return candidate === "asc" || candidate === "desc"
    ? candidate
    : DEFAULT_MEMORY_SORT_ORDER;
};

export function parseMemoryLocation(params: SearchParams) {
  return {
    page: positiveIntegerFrom(params.page),
    search: (firstValue(params.search) ?? "").trim(),
    state: stateFrom(params.state),
    sortBy: sortFieldFrom(params.sortBy),
    sortOrder: sortOrderFrom(params.sortOrder),
  };
}

export function buildMemoryHref(input: MemoryLocation = {}) {
  const params = new URLSearchParams();

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  if (input.search?.trim()) {
    params.set("search", input.search.trim());
  }

  if (input.state === "TRASHED") {
    params.set("state", input.state);
  }

  if (input.sortBy && input.sortBy !== DEFAULT_MEMORY_SORT_FIELD) {
    params.set("sortBy", input.sortBy);
  }

  if (input.sortOrder && input.sortOrder !== DEFAULT_MEMORY_SORT_ORDER) {
    params.set("sortOrder", input.sortOrder);
  }

  const query = params.toString();

  return query ? `/memories?${query}` : "/memories";
}
