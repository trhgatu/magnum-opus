"use server";

import type {
  ActivityProvider,
  ActivitySourceResponse,
  GitHubRepositoryListResponse,
  WakaTimeProjectResponse,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";
import { validId } from "@/lib/validation";

export type RepositorySearchResult =
  ({ status: "success" } & GitHubRepositoryListResponse) | MutationError;

export type WakaTimeProjectSearchResult =
  | {
      status: "success";
      projects: WakaTimeProjectResponse[];
    }
  | MutationError;

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

export async function searchWakaTimeProjects(
  search: string,
): Promise<WakaTimeProjectSearchResult> {
  const query = typeof search === "string" ? search.trim().slice(0, 200) : "";
  const params = query ? `?${new URLSearchParams({ search: query })}` : "";

  try {
    const projects = await apiFetch<WakaTimeProjectResponse[]>(
      `/integrations/wakatime/projects${params}`,
    );
    return { status: "success", projects };
  } catch (error) {
    return toMutationError(error);
  }
}

const RESOURCE_ID_FORMAT: Record<ActivityProvider, RegExp> = {
  GITHUB: /^[1-9]\d{0,18}$/,
  WAKATIME: /^[A-Za-z0-9-]{1,64}$/,
};

export async function linkActivitySource(input: {
  projectId: string;
  provider: ActivityProvider;
  externalResourceId: string;
}): Promise<LinkSourceResult> {
  if (!validId(input?.projectId)) return invalid("Project không hợp lệ.");
  const format =
    input.provider === "GITHUB" || input.provider === "WAKATIME"
      ? RESOURCE_ID_FORMAT[input.provider]
      : null;
  if (
    !format ||
    typeof input.externalResourceId !== "string" ||
    !format.test(input.externalResourceId)
  ) {
    return invalid("Nguồn hoạt động không hợp lệ.");
  }

  let source: ActivitySourceResponse;
  try {
    source = await apiFetch<ActivitySourceResponse>(
      `/projects/${input.projectId}/activity/sources`,
      {
        method: "POST",
        body: JSON.stringify({
          provider: input.provider,
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
