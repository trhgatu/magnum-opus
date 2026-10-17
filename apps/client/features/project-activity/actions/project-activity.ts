"use server";

import type {
  ActivitySourceResponse,
  GitHubRepositoryListResponse,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";
import { validId } from "@/lib/validation";

export type RepositorySearchResult =
  ({ status: "success" } & GitHubRepositoryListResponse) | MutationError;

export type LinkSourceResult =
  { status: "success"; source: ActivitySourceResponse } | MutationError;

export type UnlinkSourceResult = { status: "success" } | MutationError;

const invalid = (message: string): MutationError => ({
  status: "error",
  message,
});

/** Repository mà token đọc được, lọc phía server trên toàn bộ (07 §4.4). */
export async function searchGitHubRepositories(
  search: string,
): Promise<RepositorySearchResult> {
  const query = typeof search === "string" ? search.trim().slice(0, 140) : "";
  const params = query ? `?${new URLSearchParams({ search: query })}` : "";

  try {
    const list = await apiFetch<GitHubRepositoryListResponse>(
      `/integrations/github/repositories${params}`,
    );
    return { status: "success", ...list };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function linkActivitySource(input: {
  projectId: string;
  externalResourceId: string;
}): Promise<LinkSourceResult> {
  // Server Action có thể bị gọi với payload bất kỳ ngoài UI.
  if (!validId(input?.projectId)) return invalid("Project không hợp lệ.");
  if (
    typeof input.externalResourceId !== "string" ||
    !/^[1-9]\d{0,18}$/.test(input.externalResourceId)
  ) {
    return invalid("Repository không hợp lệ.");
  }

  let source: ActivitySourceResponse;
  try {
    source = await apiFetch<ActivitySourceResponse>(
      `/projects/${input.projectId}/activity/sources`,
      {
        method: "POST",
        body: JSON.stringify({
          provider: "GITHUB",
          externalResourceId: input.externalResourceId,
        }),
      },
    );
  } catch (error) {
    return toMutationError(error);
  }

  revalidateProject(input.projectId);
  return { status: "success", source };
}

export async function unlinkActivitySource(input: {
  projectId: string;
  feedId: string;
}): Promise<UnlinkSourceResult> {
  if (!validId(input?.projectId) || !validId(input.feedId)) {
    return invalid("Nguồn hoạt động không hợp lệ.");
  }

  try {
    await apiFetch<void>(
      `/projects/${input.projectId}/activity/sources/${input.feedId}`,
      { method: "DELETE" },
    );
  } catch (error) {
    return toMutationError(error);
  }

  revalidateProject(input.projectId);
  return { status: "success" };
}

/** Trang chi tiết và trang chỉnh sửa đều hiển thị nguồn. */
function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
}
