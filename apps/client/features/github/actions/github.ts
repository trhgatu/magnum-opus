"use server";

import type { GitHubConnectionResponse } from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";

export type GitHubConnectResult =
  { status: "success"; connection: GitHubConnectionResponse } | MutationError;

export type GitHubDisconnectResult = { status: "success" } | MutationError;

export interface ConnectGitHubInput {
  token: string;
  /** Bắt buộc khi token thuộc tài khoản GitHub khác tài khoản đang kết nối. */
  confirmAccountChange?: boolean;
}

/** Token GitHub: không khoảng trắng, không quá 255 ký tự — như server kiểm. */
const validToken = (value: unknown): value is string =>
  typeof value === "string" && /^\S{1,255}$/.test(value);

export async function connectGitHub(
  input: ConnectGitHubInput,
): Promise<GitHubConnectResult> {
  // Server Action có thể bị gọi với payload bất kỳ ngoài UI.
  const token = typeof input?.token === "string" ? input.token.trim() : null;
  if (!validToken(token)) {
    return {
      status: "error",
      message: "Dán token GitHub (không có khoảng trắng) rồi thử lại.",
    };
  }

  let connection: GitHubConnectionResponse;
  try {
    connection = await apiFetch<GitHubConnectionResponse>(
      "/integrations/github",
      {
        method: "PUT",
        body: JSON.stringify({
          token,
          confirmAccountChange: input.confirmAccountChange === true,
        }),
      },
    );
  } catch (error) {
    return toMutationError(error);
  }

  revalidatePath("/settings");
  return { status: "success", connection };
}

export async function disconnectGitHub(): Promise<GitHubDisconnectResult> {
  try {
    await apiFetch<void>("/integrations/github", { method: "DELETE" });
  } catch (error) {
    return toMutationError(error);
  }

  revalidatePath("/settings");
  return { status: "success" };
}
