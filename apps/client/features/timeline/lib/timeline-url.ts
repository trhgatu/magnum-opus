type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const positiveIntegerFrom = (value: string | string[] | undefined): number => {
  const candidate = Number(firstValue(value));
  return Number.isInteger(candidate) && candidate > 0 ? candidate : 1;
};

export function parseTimelineLocation(params: SearchParams) {
  return {
    page: positiveIntegerFrom(params.page),
  };
}

export function buildTimelineHref(page: number): string {
  return page > 1 ? `/timeline?page=${page}` : "/timeline";
}
