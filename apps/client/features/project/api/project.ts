import "server-only";

import type { ProjectLifecycleState, ProjectResponse } from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";

import { apiFetch } from "@/lib/api";

export interface ProjectListInput {
  page?: number;
  limit?: number;
  search?: string;
  state?: ProjectLifecycleState;
}

export async function getProjects(
  input: ProjectListInput = {},
): Promise<PaginatedResult<ProjectResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  const search = input.search?.trim();

  if (search) params.set("search", search);
  if (input.state) params.set("state", input.state);

  return apiFetch<PaginatedResult<ProjectResponse>>(
    `/projects?${params.toString()}`,
  );
}

export function getProject(id: string): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>(`/projects/${id}`);
}
