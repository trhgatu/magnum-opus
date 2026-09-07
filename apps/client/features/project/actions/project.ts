"use server";

import type { ProjectResponse } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";
import { validId, validRevision } from "@/lib/validation";

export type ProjectMutationResult =
  | {
      status: "success";
      project: ProjectResponse;
    }
  | MutationError;

export type ReloadProjectResult =
  | {
      status: "success";
      project: ProjectResponse;
    }
  | MutationError;

export type ProjectDeleteResult =
  | {
      status: "success";
    }
  | MutationError;

export interface CreateProjectInput {
  title: string;
  description?: string | null;
}

export interface UpdateProjectInput {
  id: string;
  title: string;
  description?: string | null;
  expectedRevision: number;
}

export interface ProjectRevisionInput {
  id: string;
  expectedRevision: number;
}

export type ProjectLifecycleAction =
  | "start"
  | "pause"
  | "resume"
  | "stop"
  | "complete"
  | "reopen";

export interface SetProjectIntendedOutcomeInput {
  id: string;
  intendedOutcome: string;
  expectedRevision: number;
}

const validLifecycleAction = (
  value: unknown,
): value is ProjectLifecycleAction =>
  value === "start" ||
  value === "pause" ||
  value === "resume" ||
  value === "stop" ||
  value === "complete" ||
  value === "reopen";

const normalizeTitle = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const title = value.trim();

  if (!title || [...title].length > 200) {
    return null;
  }

  return title;
};

const normalizeDescription = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
};

const normalizeIntendedOutcome = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const outcome = value.trim();

  return outcome || null;
};

const revalidateProject = (id: string) => {
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
};

export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectMutationResult> {
  const title = normalizeTitle(input.title);

  if (!title) {
    return {
      status: "error",
      message: "Tiêu đề Project không hợp lệ.",
    };
  }

  try {
    const project = await apiFetch<ProjectResponse>("/projects", {
      method: "POST",
      body: JSON.stringify({
        title,
        description: normalizeDescription(input.description),
      }),
    });

    revalidatePath("/projects");
    return {
      status: "success",
      project,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function reloadProject(id: string): Promise<ReloadProjectResult> {
  if (!validId(id)) {
    return {
      status: "error",
      message: "Dữ liệu Project không hợp lệ.",
    };
  }

  try {
    const project = await apiFetch<ProjectResponse>(`/projects/${id}`);

    return {
      status: "success",
      project,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function updateProject(
  input: UpdateProjectInput,
): Promise<ProjectMutationResult> {
  const title = normalizeTitle(input.title);

  if (!validId(input.id) || !validRevision(input.expectedRevision) || !title) {
    return {
      status: "error",
      message: "Dữ liệu Project không hợp lệ.",
    };
  }

  try {
    const project = await apiFetch<ProjectResponse>(`/projects/${input.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        description: normalizeDescription(input.description),
        expectedRevision: input.expectedRevision,
      }),
    });

    revalidateProject(input.id);

    return {
      status: "success",
      project,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function changeProjectLifecycle(
  input: ProjectRevisionInput & {
    action: ProjectLifecycleAction;
  },
): Promise<ProjectMutationResult> {
  if (
    !validId(input.id) ||
    !validRevision(input.expectedRevision) ||
    !validLifecycleAction(input.action)
  ) {
    return {
      status: "error",
      message: "Dữ liệu Project không hợp lệ.",
    };
  }

  try {
    const project = await apiFetch<ProjectResponse>(
      `/projects/${input.id}/${input.action}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          expectedRevision: input.expectedRevision,
        }),
      },
    );

    revalidateProject(input.id);

    return {
      status: "success",
      project,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function setProjectIntendedOutcome(
  input: SetProjectIntendedOutcomeInput,
): Promise<ProjectMutationResult> {
  const intendedOutcome = normalizeIntendedOutcome(input.intendedOutcome);

  if (
    !validId(input.id) ||
    !validRevision(input.expectedRevision) ||
    !intendedOutcome
  ) {
    return {
      status: "error",
      message: "Intended outcome không hợp lệ.",
    };
  }

  try {
    const project = await apiFetch<ProjectResponse>(
      `/projects/${input.id}/cycle/outcome`,
      {
        method: "PUT",
        body: JSON.stringify({
          intendedOutcome,
          expectedRevision: input.expectedRevision,
        }),
      },
    );

    revalidateProject(input.id);

    return {
      status: "success",
      project,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function deleteProjectPermanently(
  input: ProjectRevisionInput,
): Promise<ProjectDeleteResult> {
  if (!validId(input.id) || !validRevision(input.expectedRevision)) {
    return {
      status: "error",
      message: "Dữ liệu Project không hợp lệ.",
    };
  }

  try {
    await apiFetch<void>(
      `/projects/${input.id}?expectedRevision=${input.expectedRevision}`,
      {
        method: "DELETE",
      },
    );
  } catch (error) {
    return toMutationError(error);
  }

  revalidatePath("/projects");
  redirect("/projects");
}
