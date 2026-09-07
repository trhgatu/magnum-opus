import {
  PROJECT_LIFECYCLE_STATES,
  type ProjectLifecycleState,
} from "@repo/contracts";

export interface ProjectLocation {
  page?: number;
  search?: string;
  state?: ProjectLifecycleState;
}

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseProjectLocation(params: SearchParams) {
  const pageCandidate = Number(firstValue(params.page));
  const stateCandidate = firstValue(params.state);

  return {
    page:
      Number.isInteger(pageCandidate) && pageCandidate > 0 ? pageCandidate : 1,
    search: (firstValue(params.search) ?? "").trim(),
    state: PROJECT_LIFECYCLE_STATES.includes(
      stateCandidate as ProjectLifecycleState,
    )
      ? (stateCandidate as ProjectLifecycleState)
      : undefined,
  };
}

export function buildProjectHref(input: ProjectLocation = {}) {
  const params = new URLSearchParams();

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  if (input.search?.trim()) {
    params.set("search", input.search.trim());
  }

  if (input.state) {
    params.set("state", input.state);
  }

  const query = params.toString();

  return query ? `/projects?${query}` : "/projects";
}
